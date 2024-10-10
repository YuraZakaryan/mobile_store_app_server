import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { catchError, firstValueFrom } from 'rxjs';
import { ProductService } from 'src/product/product.service';
import { ReservationCounterService } from 'src/reservation-counter/reservation-counter.service';
import { EPriceType } from 'src/user/dto/create-user.dto';
import { FindOneParams, ReqUser } from '../types';
import { TReturnItem } from '../user/types';
import { User } from '../user/user.schema';
import { UserService } from '../user/user.service';
import { Product } from './../product/product.schema';
import { AddProductToStockOrderDto } from './dto/add-product-to-stock-order.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { ConfirmStockOrderDto } from './dto/confirm-stock-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStockOrderDto } from './dto/create-stock-order.dto';
import { ToOrderDto } from './dto/to-order.dto';
import { OrderItem, OrderItemDocument } from './schema/order-item.schema';
import { EOrderStockStatus, OrderStock } from './schema/order-stock.schema';
import { EOrderStatus, Order, OrderDocument } from './schema/order.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(OrderStock.name) private orderStockModel: Model<OrderStock>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    private userService: UserService,
    private productService: ProductService,
    private reservationCounterService: ReservationCounterService,
    private readonly httpService: HttpService,
  ) {}

  async createOrAdd(dto: CreateOrderDto) {
    const existOrder = await this.orderModel.findOne({
      author: dto.author,
      status: EOrderStatus.IN_PROGRESS,
    });

    const product = await this.productModel.findById(dto.product);
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    const user = await this.userModel.findById(dto.author);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.confirmed) {
      throw new HttpException('User not confirmed yet', HttpStatus.CONFLICT);
    }
    if (user.banned) {
      throw new HttpException('User banned', HttpStatus.GONE);
    }

    const getProductQuantity =
      await this.productService.getProductQuantityDetails(product._id);

    if (dto.itemCount > getProductQuantity.availableQuantity) {
      throw new HttpException(
        'not_enough_product_quantity_in_stock',
        HttpStatus.BAD_GATEWAY,
      );
    }

    let orderId: Types.ObjectId | null;

    if (!existOrder) {
      const orderItem = await this.orderItemModel.create({
        ...dto,
        reserved: null,
      });

      const order = await this.orderModel.create({
        author: dto.author,
        authorName: user.firstname,
        status: EOrderStatus.IN_PROGRESS,
        necessaryNotes: '',
        items: [orderItem._id],
        acceptedTime: null,
        confirmedTime: null,
        deliveredTime: null,
        rejectedTime: null,
      });

      orderId = order._id;
      orderItem.order = orderId;
      await orderItem.save();
    } else {
      orderId = existOrder._id;

      const existOrderItem = await this.orderItemModel.findOne({
        product: dto.product,
        author: dto.author,
        inProgress: true,
      });

      if (existOrderItem) {
        existOrderItem.itemCount += dto.itemCount;
        await existOrderItem.save();
      } else {
        const orderItem = await this.orderItemModel.create({
          ...dto,
          order: orderId,
          reserved: null,
        });

        if (existOrder.status !== EOrderStatus.IN_PROGRESS) {
          throw new HttpException('Order already ordered', HttpStatus.CONFLICT);
        }

        existOrder.items.push(orderItem._id);
        await existOrder.save();
      }
    }

    const reservationId =
      await this.reservationCounterService.createOrUpdateReservation(
        product._id,
        user._id,
        dto.itemCount,
        orderId,
      );

    await this.orderItemModel.updateMany(
      { order: orderId, reserved: null },
      { $set: { reserved: reservationId } },
    );

    return product;
  }

  async createEmptyStockOrder(req: ReqUser) {
    const authorId = req.user.sub;

    const user = await this.userModel.findById(authorId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const existEmptyOrder = await this.orderStockModel.findOne({
      author: authorId,
      counterpartyId: '',
      counterpartyName: '',
      status: EOrderStockStatus.IN_PROGRESS,
    });

    if (existEmptyOrder) {
      throw new HttpException('Empty order is exist', HttpStatus.CONFLICT);
    }

    return await this.orderStockModel.create({
      items: [],
      counterpartyId: '',
      counterpartyName: '',
      author: authorId,
      confirmedTime: null,
      status: EOrderStockStatus.IN_PROGRESS,
    });
  }

  async updateStockOrder(
    req: ReqUser,
    params: FindOneParams,
    dto: UpdateStockOrderDto,
  ) {
    const userId = req.user.sub;
    const orderId = params.id;

    const {
      counterpartyId,
      counterpartyName,
      necessaryNotes,
      discountPercent,
      priceType,
      isEdited,
      items,
    } = dto;

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const order = await this.orderStockModel.findById(orderId);

    if (!order) {
      throw new HttpException('order_not_found', HttpStatus.FORBIDDEN);
    }

    if (isEdited) {
      const newOrder = await this.orderStockModel.create({
        items: [],
        counterpartyId,
        counterpartyName,
        necessaryNotes,
        discountPercent,
        priceType,
        author: userId,
        confirmedTime: null,
        status: EOrderStockStatus.IN_PROGRESS,
      });

      for (const item of items) {
        const product = await this.productModel.findById(item.product._id);

        if (!product) {
          throw new HttpException('product_not_found', HttpStatus.NOT_FOUND);
        }

        const getProductQuantity =
          await this.productService.getProductQuantityDetails(product._id);

        if (item.itemCount > getProductQuantity.availableQuantity) {
          throw new HttpException(
            'not_enough_product_quantity_in_stock',
            HttpStatus.BAD_GATEWAY,
          );
        }

        const orderItem = await this.orderItemModel.create({
          itemCount: item.itemCount,
          inProgress: true,
          order: newOrder._id,
          product: item.product._id,
          forStock: true,
          author: userId,
        });

        await this.reservationCounterService.createOrUpdateReservation(
          product._id,
          newOrder.author,
          item.itemCount,
          newOrder._id,
          true,
        );

        newOrder.items.push(orderItem._id);
      }

      await newOrder.save();

      const orderItems = await this.getOrderItemsWithReservationByOrderId(
        order._id,
        true,
      );

      return {
        ...newOrder.toObject(),
        items: orderItems,
      };
    }

    for (const item of items) {
      if (item.inProgress) {
        const product = await this.productModel.findById(item.product);

        const getProductQuantity =
          await this.productService.getProductQuantityDetails(product._id);

        if (item.itemCount > getProductQuantity.availableQuantity) {
          throw new HttpException(
            'not_enough_product_quantity_in_stock',
            HttpStatus.BAD_GATEWAY,
          );
        }

        await this.orderItemModel.findOneAndUpdate(
          {
            _id: item._id,
            inProgress: true,
          },
          { $set: { itemCount: item.itemCount } },
          { new: true },
        );

        await this.reservationCounterService.createOrUpdateReservation(
          product._id,
          order.author,
          item.itemCount,
          order._id,
          true,
        );
      }
    }

    // Search order by author and status will be equal in progress
    const updateOrder = await this.orderStockModel.findByIdAndUpdate(
      orderId,
      {
        counterpartyId,
        counterpartyName,
        necessaryNotes,
        priceType,
        discountPercent,
      },
      { new: true },
    );

    const orderItems = await this.getOrderItemsWithReservationByOrderId(
      order._id,
      true,
    );

    if (updateOrder) {
      return {
        ...updateOrder.toObject(),
        items: orderItems,
      };
    }
  }

  async confirmOrder(
    priceKey: string,
    orderId: Types.ObjectId,
    counterpartyId: string,
    items: OrderItem[],
    relatedOrderModel: Model<Order | OrderStock>,
    percent?: number,
  ) {
    const { token } = await this.userService.getMainAdminInfo();

    const order = await relatedOrderModel.findById(orderId).populate({
      path: 'items',
      model: 'OrderItem',
      populate: {
        path: 'product',
        model: 'Product',
      },
    });

    if (!order)
      throw new HttpException('order_not_found', HttpStatus.NOT_FOUND);

    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpException('items_array_is_empty', HttpStatus.NOT_FOUND);
    }

    for (const item of items as OrderItemDocument[]) {
      if (item.inProgress) {
        const product = await this.productModel.findById(item.product);

        const getProductQuantity =
          await this.productService.getProductQuantityDetails(product._id);

        if (item.itemCount > getProductQuantity.availableQuantity) {
          throw new HttpException(
            'not_enough_product_quantity_in_stock',
            HttpStatus.BAD_GATEWAY,
          );
        }

        await this.orderItemModel.findOneAndUpdate(
          {
            _id: item._id,
            inProgress: true,
          },
          { $set: { itemCount: item.itemCount } },
          { new: true },
        );

        await this.reservationCounterService.createOrUpdateReservation(
          product._id,
          order.author,
          item.itemCount,
          order._id,
        );
      }
    }

    const apiUrl: string = `https://api.moysklad.ru/api/remap/1.2/entity/customerorder`;

    const headers = {
      Authorization: token,
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/json',
    };

    const positions = items.map((item) => {
      const product = item.product as any;

      let price: number;

      if (priceKey && percent !== undefined) {
        // Calculate final price with discount
        const discountAmount = (product[priceKey] * percent) / 100;
        price = product[priceKey] - discountAmount;
      } else {
        price = product.price;
      }

      return {
        quantity: item.itemCount,
        price: price * 100,
        assortment: {
          meta: {
            href: `https://api.moysklad.ru/api/remap/1.2/entity/product/${product.idProductByStock}`,
            type: 'product',
            mediaType: 'application/json',
          },
        },
      };
    });

    const orderData = {
      organization: {
        meta: {
          href: 'https://api.moysklad.ru/api/remap/1.2/entity/organization/9a8c7b2a-8e29-11ee-0a80-0d630002a5c2',
          type: 'organization',
          mediaType: 'application/json',
        },
      },
      agent: {
        meta: {
          href: `https://api.moysklad.ru/api/remap/1.2/entity/counterparty/${counterpartyId}`,
          type: 'counterparty',
          mediaType: 'application/json',
        },
      },
      positions,
    };

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(apiUrl, orderData, {
            headers,
          })
          .pipe(
            catchError((error) => {
              const statusCode = error.response?.status;

              throw new HttpException(
                statusCode == 401
                  ? 'invalid_token'
                  : 'one_of_the_values_does_not_match_the_request_body',
                statusCode,
              );
            }),
          ),
      );

      const nowDate = new Date();

      order.status = EOrderStockStatus.CONFIRMED;
      order.confirmedTime = nowDate;
      order.stockOrderId = response.data.id;

      const savedOrder = await order.save();

      if (savedOrder) {
        for (const item of items) {
          const { product, itemCount } = item;

          await this.orderItemModel.updateMany(
            {
              order: orderId,
              product: product._id,
            },
            {
              itemCount,
              inProgress: false,
            },
          );
        }
      }

      const orderItems = await this.getOrderItemsWithReservationByOrderId(
        order._id,
        true,
      );

      if (savedOrder) {
        return {
          ...savedOrder.toObject(),
          items: orderItems,
        };
      }
    } catch (err) {
      throw new HttpException(err.message, err.status);
    }
  }

  async confirmStockOrder(req: ReqUser, dto: ConfirmStockOrderDto) {
    const userId = req.user.sub;
    const { orderId, counterpartyId, items } = dto;

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException('user_not_found', HttpStatus.BAD_REQUEST);
    }
    const counterparty =
      await this.userService.getOneCounterpartyById(counterpartyId);

    if (!counterparty)
      throw new HttpException('counterparty_not_found', HttpStatus.NOT_FOUND);

    return await this.confirmOrder(
      '',
      orderId,
      counterpartyId,
      items,
      this.orderStockModel,
    );
  }

  async addProductToStockOrder(dto: AddProductToStockOrderDto) {
    const existOrder = await this.orderStockModel.findOne({
      _id: dto.order,
      author: dto.author,
      status: EOrderStockStatus.IN_PROGRESS,
    });

    if (!existOrder) {
      throw new HttpException('the_order_does_not_exist', HttpStatus.CONFLICT);
    }

    // Find product, when it doesn't exist, show error
    const product = await this.productModel.findById(dto.product);

    if (!product) {
      throw new HttpException('product_not_found', HttpStatus.NOT_FOUND);
    }

    const user = await this.userModel.findById(dto.author);

    if (!user) {
      throw new HttpException('user_not_found', HttpStatus.NOT_FOUND);
    }

    const getProductQuantity =
      await this.productService.getProductQuantityDetails(product._id);

    if (dto.itemCount > getProductQuantity.availableQuantity) {
      throw new HttpException(
        'not_enough_product_quantity_in_stock',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const existOrderItem = await this.orderItemModel.findOne({
      order: dto.order,
      product: dto.product,
      author: dto.author,
      inProgress: true,
      forStock: true,
    });

    if (existOrderItem) {
      throw new HttpException(
        'the_item_in_the_order_has_already_been_added',
        HttpStatus.CONFLICT,
      );
    } else {
      // Add reservation logic
      const reservationId =
        await this.reservationCounterService.createOrUpdateReservation(
          product._id,
          user._id,
          dto.itemCount,
          existOrder._id,
          true,
        );

      const orderItem = await this.orderItemModel.create({
        ...dto,
        reserved: reservationId,
      });

      orderItem.order = existOrder._id;
      existOrder.items.push(orderItem._id);

      await orderItem.save();
      await existOrder.save();

      return orderItem;
    }
  }

  async toOrder(params: FindOneParams, dto: ToOrderDto) {
    const orderId = params.id;
    const { necessaryNotes, items } = dto;

    const existOrder = await this.orderModel.findById(orderId);
    if (!existOrder) {
      throw new HttpException('the_order_does_not_exist', HttpStatus.CONFLICT);
    }

    for (const item of items) {
      if (item.inProgress) {
        const product = await this.productModel.findById(item.product);

        const getProductQuantity =
          await this.productService.getProductQuantityDetails(product._id);

        if (item.itemCount > getProductQuantity.availableQuantity) {
          throw new HttpException(
            'not_enough_product_quantity_in_stock',
            HttpStatus.BAD_GATEWAY,
          );
        }

        await this.orderItemModel.findOneAndUpdate(
          {
            _id: item._id,
            inProgress: true,
          },
          { $set: { itemCount: item.itemCount } },
          { new: true },
        );

        await this.reservationCounterService.createOrUpdateReservation(
          product._id,
          existOrder.author,
          item.itemCount,
          existOrder._id,
        );
      }
    }

    const currentDate: Date = new Date();
    const isoString: string = currentDate.toISOString();

    const updateOrder = await this.orderModel.findByIdAndUpdate(orderId, {
      necessaryNotes,
      status: EOrderStatus.ORDERED,
      confirmedTime: isoString,
    });

    if (updateOrder) {
      await this.orderItemModel.updateMany(
        { order: orderId, inProgress: true },
        {
          inProgress: false,
        },
      );
      return existOrder;
    }
  }

  async deleteStockOrderItem(params: FindOneParams): Promise<Types.ObjectId> {
    const id = params.id;
    return this.deleteOrderItemById(id, this.orderStockModel, false);
  }

  async deleteOrderItem(params: FindOneParams) {
    const id = params.id;
    return this.deleteOrderItemById(id, this.orderModel, true);
  }

  async changeOrderStatus(
    req: ReqUser,
    params: FindOneParams,
    dto: ChangeOrderStatusDto,
  ): Promise<Order> {
    const userId = req.user.sub;
    const currentDate: Date = new Date();

    const orderId = params.id;

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException('user_not_found', HttpStatus.NOT_FOUND);
    }

    const order = await this.orderModel
      .findById(orderId)
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: {
          path: 'product',
          model: 'Product',
        },
      })
      .populate('author');

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    if (!dto.status) {
      throw new HttpException('Please type status', HttpStatus.FORBIDDEN);
    }

    switch (dto.status) {
      case EOrderStatus.CONFIRMED:
        if (order.status !== EOrderStatus.CONFIRMED) {
          const author = await this.userModel.findById(order.author);

          if (!author) {
            throw new HttpException('user_not_found', HttpStatus.NOT_FOUND);
          }

          const counterparty = await this.userService.getOneCounterpartyById(
            author.idCounterparty,
          );

          if (!counterparty) {
            throw new HttpException(
              'counterparty_not_found',
              HttpStatus.NOT_FOUND,
            );
          }

          const items = await this.orderItemModel
            .find({ order: orderId })
            .populate('product');

          const checkPriceType = {
            [EPriceType.RETAIL]: 'priceRetail',
            [EPriceType.WHOLESALE]: 'priceWholesale',
          };

          const priceType = author.priceType || EPriceType.RETAIL;

          const priceKey = checkPriceType[priceType];

          await this.confirmOrder(
            priceKey,
            orderId,
            author.idCounterparty,
            items,
            this.orderModel,
            author.discountPercent,
          );
        }
        break;
      case EOrderStatus.DELIVERED:
        if (order.status !== EOrderStatus.DELIVERED) {
          order.deliveredTime = currentDate;
          await order.save();
        }
        break;
      case EOrderStatus.REJECTED:
        await this.reservationCounterService.removeReservationByOrderId(
          orderId,
        );
        order.rejectedTime = currentDate;
        await order.save();
        break;
    }

    // order.status = dto.status;
    // await order.save();

    return order;
  }

  async getStockOrderById(params: FindOneParams) {
    const id = params.id;

    const order = await this.orderStockModel.findById(id);

    if (!order) {
      throw new HttpException('order_not_found', HttpStatus.NOT_FOUND);
    }

    const orderItems = await this.getOrderItemsWithReservationByOrderId(
      order._id,
      true,
      order.status,
    );

    return {
      ...order.toObject(),
      items: orderItems,
    };
  }

  async getOrderInProgress(params: FindOneParams) {
    const id = params.id;

    const order = await this.orderModel.findOne({
      author: id,
      status: EOrderStatus.IN_PROGRESS,
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    const orderItems = await this.getOrderItemsWithReservationByOrderId(
      order._id,
      false,
    );

    return {
      ...order.toObject(),
      items: orderItems,
    };
  }

  async getDeliveredOrders(
    name?: string,
    limit?: number,
    skip?: number,
  ): Promise<TReturnItem<Order[]>> {
    const queryConditions: any = {};

    if (name !== undefined) {
      queryConditions.authorName = { $regex: new RegExp(name, 'i') };
    }

    const query: any = this.orderModel
      .find({
        ...queryConditions,
        status: { $in: [EOrderStatus.DELIVERED, EOrderStatus.REJECTED] },
      })
      .sort({ _id: -1 })
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: {
          path: 'product',
          model: 'Product',
        },
      })
      .populate('author');

    const totalItemsQuery: any = this.orderModel.find({
      ...queryConditions,
      status: { $in: [EOrderStatus.DELIVERED, EOrderStatus.REJECTED] },
    });

    const totalItems = await totalItemsQuery.countDocuments().exec();

    const orders = await query.limit(limit).skip(skip).exec();

    if (!orders || orders.length === 0) {
      throw new HttpException('Orders not found', HttpStatus.NOT_FOUND);
    }

    const ordersWithDetails = await Promise.all(
      orders.map(async (order: OrderDocument) => {
        const orderItemsWithReservation =
          await this.getOrderItemsWithReservationByOrderId(
            order._id,
            false,
            order.status,
          );

        return {
          ...order.toObject(),
          items: orderItemsWithReservation,
        };
      }),
    );

    return {
      total_items: totalItems,
      items: ordersWithDetails,
    };
  }

  async deleteOrderItemById(
    id: Types.ObjectId,
    relatedModel: Model<Order | OrderStock>,
    removeOrder: boolean = true,
  ): Promise<Types.ObjectId> {
    const orderItem = await this.orderItemModel.findById(id);
    if (!orderItem) {
      throw new HttpException('Order item not found!', HttpStatus.NOT_FOUND);
    }

    const orderId = orderItem.order;

    const deletedOrderItem = await this.orderItemModel.findByIdAndDelete(id);
    if (!deletedOrderItem) {
      throw new HttpException(
        'Error deleting order item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const relatedOrder = await relatedModel.findOne({ _id: orderId });

    if (removeOrder && relatedOrder && relatedOrder.items.length === 1) {
      await relatedOrder.deleteOne();
    } else {
      const updateResult = await relatedModel.updateOne(
        { _id: orderId },
        { $pull: { items: id } },
      );
      if (updateResult.modifiedCount === 0) {
        throw new HttpException(
          'Failed to update order',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    await this.reservationCounterService.removeReservation(
      orderItem.product._id,
      orderItem.author,
      orderId,
    );

    return orderItem._id;
  }

  async getOrdersByAuthorId(
    params: FindOneParams,
    limit?: number,
    skip?: number,
  ) {
    const authorId = params.id;
    const query = this.orderModel
      .find({
        author: authorId,
      })
      .sort({ _id: -1 });

    const totalItemsQuery = this.orderModel.find({
      author: authorId,
    });

    const totalItems = await totalItemsQuery.countDocuments().exec();

    const orders = await query.limit(limit).skip(skip).exec();

    if (!orders && orders.length === 0) {
      throw new HttpException('Orders not found', HttpStatus.NOT_FOUND);
    }
    const ordersWithReservations = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await this.getOrderItemsWithReservationByOrderId(
          order._id,
          false,
          order.status,
        );
        return {
          ...order.toObject(),
          items: orderItems,
        };
      }),
    );

    return {
      total_items: totalItems,
      items: ordersWithReservations,
    };
  }

  async getOrderItemsWithReservationByOrderId(
    orderId: Types.ObjectId,
    forStock: boolean | null,
    status?: EOrderStockStatus | EOrderStatus,
  ) {
    const orderItems = await this.orderItemModel
      .find({ order: orderId, forStock })
      .populate('product')
      .lean();

    const orderItemsWithReservations = await Promise.all(
      orderItems.map(async (item) => {
        const productQuantityDetails =
          await this.productService.getProductQuantityDetails(item.product._id);

        const reservation =
          await this.reservationCounterService.getReservationByProductAndOrder(
            item.product._id,
            orderId,
          );

        const price = await this.productService.calculateProductPrice(
          item.author,
          item.product._id,
        );

        return {
          ...item,
          itemCount:
            status && status !== EOrderStockStatus.IN_PROGRESS
              ? item.itemCount
              : reservation
                ? reservation.quantity
                : 0,
          product: {
            ...item.product,
            price,
            count: productQuantityDetails.availableQuantity,
            totalReserved: productQuantityDetails.totalReservedQuantity,
          },
        };
      }),
    );

    return orderItemsWithReservations;
  }

  async getOrderByStockOrderId(id: string) {
    let order = await this.orderModel.findOne({
      stockOrderId: id,
    });

    if (!order) {
      order = await this.orderStockModel.findOne({
        stockOrderId: id,
      });
    }

    if (!order) {
      console.warn('Order not found');
      return null;
    }

    return order;
  }

  async getAll(name?: string, limit?: number, skip?: number) {
    const queryConditions: any = {};

    if (name !== undefined) {
      queryConditions.authorName = { $regex: new RegExp(name, 'i') };
    }

    const query = this.orderModel
      .find({
        ...queryConditions,
        status: {
          $nin: [
            EOrderStatus.IN_PROGRESS,
            EOrderStatus.DELIVERED,
            EOrderStatus.REJECTED,
          ],
        },
      })
      .sort({ _id: -1 })
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: {
          path: 'product',
          model: 'Product',
        },
      })
      .populate('author');

    const totalItemsQuery = this.orderModel.find({
      ...queryConditions,
      status: {
        $nin: [
          EOrderStatus.IN_PROGRESS,
          EOrderStatus.DELIVERED,
          EOrderStatus.REJECTED,
        ],
      },
    });

    const totalItems = await totalItemsQuery.countDocuments().exec();

    const orders = await query.limit(limit).skip(skip).exec();

    if (!orders || orders.length === 0) {
      throw new HttpException('Orders not found', HttpStatus.NOT_FOUND);
    }

    const ordersWithDetails = await Promise.all(
      orders.map(async (order: OrderDocument) => {
        const orderItemsWithReservation =
          await this.getOrderItemsWithReservationByOrderId(order._id, false);

        return {
          ...order.toObject(),
          items: orderItemsWithReservation,
        };
      }),
    );

    return {
      total_items: totalItems,
      items: ordersWithDetails,
    };
  }

  async getAllStockOrders(
    req: ReqUser,
    name?: string,
    limit?: number,
    skip?: number,
    status: 'active' | 'history' = 'active',
  ): Promise<TReturnItem<OrderStock[]>> {
    const authorId = req.user.sub;

    const user = await this.userModel.findById(authorId);

    if (!user) {
      throw new HttpException('user_not_found', HttpStatus.NOT_FOUND);
    }

    const queryConditions: any = {};

    if (name && name.trim() !== '') {
      queryConditions.counterpartyName = { $regex: new RegExp(name, 'i') };
    }

    const orders = await this.orderStockModel
      .find({
        author: authorId,
        status:
          status && status === 'history'
            ? { $ne: EOrderStatus.IN_PROGRESS }
            : EOrderStatus.IN_PROGRESS,
        ...queryConditions,
      })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .exec();

    const totalItems = orders.length;

    if (!Array.isArray(orders) || orders.length === 0) {
      throw new HttpException('Orders not found', HttpStatus.NOT_FOUND);
    }

    return {
      total_items: totalItems,
      items: orders,
    };
  }
}
