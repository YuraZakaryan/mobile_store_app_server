import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { catchError, firstValueFrom } from 'rxjs';
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
import { OrderItem } from './schema/order-item.schema';
import { EOrderStockStatus, OrderStock } from './schema/order-stock.schema';
import { EOrderStatus, EPackage, Order } from './schema/order.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(OrderStock.name) private orderStockModel: Model<OrderStock>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    private userService: UserService,
    private reservationCounterService: ReservationCounterService,
    private readonly httpService: HttpService,
  ) {}

  async createOrAdd(dto: CreateOrderDto) {
    // Search order by author and status will be equal in progress
    const existOrder = await this.orderModel.findOne({
      author: dto.author,
      status: EOrderStatus.IN_PROGRESS,
    });

    // Find product, when it doesn't exist, show error
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

    if (dto.itemCount > product.count) {
      throw new HttpException(
        'Not enough quantity in stock',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Add reservation logic
    const reservationId =
      await this.reservationCounterService.createOrUpdateReservation(
        product._id,
        user._id,
        dto.itemCount,
      );

    if (!existOrder) {
      const orderItem = await this.orderItemModel.create({
        ...dto,
        reserved: reservationId,
      });
      // Create order when it doesn't exist
      const order = await this.orderModel.create({
        author: dto.author,
        authorName: user.firstname,
        status: EOrderStatus.IN_PROGRESS,
        necessaryNotes: '',
        packaging: EPackage.BAG,
        items: [orderItem._id],
        acceptedTime: null,
        confirmedTime: null,
        deliveredTime: null,
        rejectedTime: null,
      });
      orderItem.order = order._id;
      await orderItem.save();
    } else {
      // if order item existed add up by item count from dto
      const existOrderItem = await this.orderItemModel.findOne({
        product: dto.product,
        author: dto.author,
        inProgress: true,
      });
      if (existOrderItem) {
        existOrderItem.itemCount += dto.itemCount;
        await existOrderItem.save();
      } else {
        // Add product to existed order
        const orderItem = await this.orderItemModel.create({
          ...dto,
          order: existOrder._id,
          reserved: reservationId,
        });
        if (existOrder.status !== EOrderStatus.IN_PROGRESS) {
          throw new HttpException('Order already ordered', HttpStatus.CONFLICT);
        }
        existOrder.items.push(orderItem._id);
        await existOrder.save();
      }
    }
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
        necessaryNotes: necessaryNotes,
        author: userId,
        confirmedTime: null,
        status: EOrderStockStatus.IN_PROGRESS,
      });

      for (const item of items) {
        const product = await this.productModel.findById(item.product._id);

        if (!product) {
          throw new HttpException('product_not_found', HttpStatus.NOT_FOUND);
        }

        if (item.itemCount > product.count) {
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

        await orderItem.save();

        newOrder.items.push(orderItem._id);
      }

      await newOrder.save();

      return newOrder.populate({
        path: 'items',
        model: 'OrderItem',
        populate: {
          path: 'product',
          model: 'Product',
        },
      });
    }

    for (const item of items) {
      if (item.inProgress) {
        const product = await this.productModel.findById(item.product._id);

        if (!product) {
          throw new HttpException('product_not_found', HttpStatus.NOT_FOUND);
        }

        if (item.itemCount > product.count) {
          throw new HttpException(
            'Not enough quantity in stock',
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
      }
    }

    for (const item of items) {
      if (item.inProgress) {
        const product = await this.productModel.findById(item.product);

        if (item.itemCount > product.count) {
          throw new HttpException(
            'Not enough quantity in stock',
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
      }
    }

    // Search order by author and status will be equal in progress
    const updateOrder = await this.orderStockModel.findByIdAndUpdate(
      orderId,
      {
        counterpartyId,
        counterpartyName,
        necessaryNotes,
      },
      { new: true },
    );

    if (updateOrder) {
      return updateOrder.populate({
        path: 'items',
        model: 'OrderItem',
        populate: {
          path: 'product',
          model: 'Product',
        },
      });
    }
  }

  async confirmStockOrder(req: ReqUser, dto: ConfirmStockOrderDto) {
    const userId = req.user.sub;
    const { orderId, counterpartyId, items } = dto;

    const user = await this.userModel.findById(userId);

    if (!user) throw new HttpException('user_not_found', HttpStatus.NOT_FOUND);

    if (!user.stockToken) {
      throw new HttpException('token_not_found', HttpStatus.NOT_FOUND);
    }

    const order = await this.orderStockModel.findById(orderId);

    if (!order)
      throw new HttpException('order_not_found', HttpStatus.NOT_FOUND);

    const counterparty = await this.userService.getOneCounterpartyById(
      req,
      counterpartyId,
    );
    if (!counterparty)
      throw new HttpException('counterparty_not_found', HttpStatus.NOT_FOUND);

    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpException('items_array_is_empty', HttpStatus.NOT_FOUND);
    }

    const token: string = user.stockToken;
    const apiUrl: string = `https://api.moysklad.ru/api/remap/1.2/entity/customerorder`;

    const headers = {
      Authorization: token,
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/json',
    };

    const checkPriceType = {
      [EPriceType.RETAIL]: 'priceRetail',
      [EPriceType.WHOLESALE]: 'wholesale',
    };

    const positions = items.map((item) => {
      const product = item.product as any;

      const priceType = user.priceType || EPriceType.RETAIL;

      const priceKey = checkPriceType[priceType];

      const price = product[priceKey] ?? product.priceRetail;

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
      await firstValueFrom(
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

      return savedOrder.populate({
        path: 'items',
        model: 'OrderItem',
        populate: {
          path: 'product',
          model: 'Product',
        },
      });
    } catch (err) {
      throw new HttpException(err.message, err.status);
    }
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

    if (dto.itemCount > product.count) {
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
      const orderItem = await this.orderItemModel.create(dto);
      orderItem.order = existOrder._id;
      existOrder.items.push(orderItem._id);

      await orderItem.save();
      await existOrder.save();

      return orderItem;
    }
  }

  async toOrder(params: FindOneParams, dto: ToOrderDto) {
    const orderId = params.id;

    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    for (const item of dto.items) {
      if (item.inProgress) {
        const product = await this.productModel.findById(item.product);
        const orderItem = await this.orderItemModel.findById(item._id).lean();
        const oldItemCount: number = orderItem.itemCount;

        if (item.itemCount > product.count) {
          throw new HttpException(
            'Not enough quantity in stock',
            HttpStatus.BAD_GATEWAY,
          );
        }
        if (oldItemCount < item.itemCount) {
          product.count = Math.max(
            0,
            product.count - (item.itemCount - oldItemCount),
          );

          await product.save();
        } else if (oldItemCount > item.itemCount) {
          product.count += oldItemCount - item.itemCount;
          await product.save();
        }
        await this.orderItemModel.findOneAndUpdate(
          {
            _id: item._id,
            inProgress: true,
          },
          { $set: { itemCount: item.itemCount } },
          { new: true },
        );
      }
    }

    const currentDate: Date = new Date();
    const isoString: string = currentDate.toISOString();

    const updateOrder = await this.orderModel.findByIdAndUpdate(orderId, {
      packaging: dto.packaging,
      necessaryNotes: dto.necessaryNotes,
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
      return order;
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
    params: FindOneParams,
    dto: ChangeOrderStatusDto,
  ): Promise<Order> {
    const id = params.id;
    const currentDate: Date = new Date();

    const order = await this.orderModel
      .findById(id)
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
      case EOrderStatus.ACCEPTED:
        if (order.status !== EOrderStatus.ACCEPTED) {
          order.acceptedTime = currentDate;
          await order.save();

          for (const item of dto.items) {
            const productId = item.product._id;
            const product = await this.productModel.findById(productId);

            if (product) {
              product.count = Math.max(product.count - item.itemCount, 0);
              await product.save();
            }
          }
        }
        break;
      case EOrderStatus.DELIVERED:
        if (order.status !== EOrderStatus.DELIVERED) {
          order.deliveredTime = currentDate;
          await order.save();
        }
        break;
      case EOrderStatus.REJECTED:
        order.rejectedTime = currentDate;
        await order.save();
        break;
    }

    order.status = dto.status;
    await order.save();

    return order;
  }

  async getStockOrderById(params: FindOneParams): Promise<OrderStock> {
    const id = params.id;

    const order = await this.orderStockModel.findById(id);

    if (!order) {
      throw new HttpException('order_not_found', HttpStatus.NOT_FOUND);
    }

    return order.populate({
      path: 'items',
      model: 'OrderItem',
      populate: {
        path: 'product',
        model: 'Product',
      },
    });
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

    // Use the new method to get order items
    const orderItems = await this.getOrderItemsWithReservationByOrderId(
      order._id,
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

    return {
      total_items: totalItems,
      items: orders,
    };
  }

  async deleteOrderItemByIdTest(id: Types.ObjectId) {
    const orderItem = await this.orderItemModel.findById(id);

    if (!orderItem) {
      throw new HttpException('Order item not found!', HttpStatus.NOT_FOUND);
    }

    await this.reservationCounterService.removeReservation(
      orderItem.product._id,
      orderItem.author._id,
    );

    return 'Success!';
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
    );

    return orderItem._id;
  }

  async getOrderByAuthorId(
    params: FindOneParams,
    limit?: number,
    skip?: number,
  ): Promise<TReturnItem<Order[]>> {
    const authorId = params.id;
    const query = this.orderModel
      .find({
        author: authorId,
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
      author: authorId,
    });

    const totalItems = await totalItemsQuery.countDocuments().exec();

    const orders = await query.limit(limit).skip(skip).exec();

    if (!orders && orders.length === 0) {
      throw new HttpException('Orders not found', HttpStatus.NOT_FOUND);
    }
    return {
      total_items: totalItems,
      items: orders,
    };
  }

  async getOrderItemsWithReservationByOrderId(
    orderId: Types.ObjectId,
  ): Promise<OrderItem[]> {
    const orderItems = await this.orderItemModel
      .find({ order: orderId })
      .populate('product');

    const orderItemsWithReservations = await Promise.all(
      orderItems.map(async (item) => {
        const reservations =
          await this.reservationCounterService.getReservationsByProduct(
            item.product._id,
          );

        // Find the quantity of the reservation associated with this order item
        const reservation = reservations.find((res) =>
          res.product.equals(item.product._id),
        );

        return {
          ...item.toObject(),
          itemCount: reservation ? reservation.quantity : 0,
        };
      }),
    );

    return orderItemsWithReservations;
  }

  async getAll(
    name?: string,
    limit?: number,
    skip?: number,
  ): Promise<TReturnItem<Order[]>> {
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

    return {
      total_items: totalItems,
      items: orders,
    };
  }

  async getAllStockOrders(
    req: ReqUser,
    name?: string,
    limit?: number,
    skip?: number,
    status: EOrderStockStatus = EOrderStockStatus.IN_PROGRESS,
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
        status,
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
