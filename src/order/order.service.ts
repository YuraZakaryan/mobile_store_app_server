import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EOrderStatus, EPackage, Order } from './schema/order.schema';
import { Model, Types } from 'mongoose';
import { OrderItem } from './schema/order-item.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { Product } from '../product/product.schema';
import { FindOneParams } from '../types';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { ToOrderDto } from './dto/to-order.dto';
import { TReturnItem } from '../user/types';
import { User } from '../user/user.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async createOrAdd(dto: CreateOrderDto): Promise<Order> {
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

    if (!existOrder) {
      const orderItem = await this.orderItemModel.create(dto);
      // Create order when it doesn't exist
      const order = await this.orderModel.create({
        author: dto.author,
        status: EOrderStatus.IN_PROGRESS,
        necessaryNotes: '',
        packaging: EPackage.BAG,
        items: [orderItem._id],
        acceptedTime: '',
        confirmedTime: '',
        deliveredTime: '',
      });
      orderItem.order = order._id;
      await orderItem.save();
      return order.populate({
        path: 'items',
        model: 'OrderItem',
        populate: {
          path: 'product',
          model: 'Product',
        },
      });
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
        });
        if (existOrder.status !== EOrderStatus.IN_PROGRESS) {
          throw new HttpException('Order already ordered', HttpStatus.CONFLICT);
        }
        existOrder.items.push(orderItem._id);
        await existOrder.save();
      }

      return existOrder.populate({
        path: 'items',
        model: 'OrderItem',
        populate: {
          path: 'product',
          model: 'Product',
        },
      });
    }
  }

  async toOrder(params: FindOneParams, dto: ToOrderDto) {
    const orderId = params.id;

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }
    const currentDate: Date = new Date();
    const isoString: string = currentDate.toISOString();

    const updateOrder = await this.orderModel.findByIdAndUpdate(orderId, {
      packaging: dto.packaging,
      necessaryNotes: dto.necessaryNotes,
      status: EOrderStatus.ORDERED,
      confirmedTime: isoString,
    });

    for (const item of dto.items) {
      if (item.inProgress) {
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

  async deleteOrderItem(params: FindOneParams): Promise<Types.ObjectId> {
    const id = params.id;

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

    const order = await this.orderModel.findOne({ _id: orderId });

    if (order && order.items.length === 1) {
      await order.deleteOne();
    } else {
      await this.orderModel.updateOne(
        { _id: orderId },
        { $pull: { items: id } },
      );
    }
    return orderItem._id;
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
    if (dto.status === EOrderStatus.ORDERED) {
      order.acceptedTime = null;
      order.deliveredTime = null;
    } else if (dto.status === EOrderStatus.ACCEPTED) {
      order.acceptedTime = currentDate;
      order.deliveredTime = null;
    } else if (dto.status === EOrderStatus.DELIVERED) {
      order.deliveredTime = currentDate;
    }
    order.status = dto.status;
    await order.save();

    return order;
  }

  async getOrderInProgress(params: FindOneParams): Promise<Order> {
    const id = params.id;
    const order = await this.orderModel.findOne({
      author: id,
      status: EOrderStatus.IN_PROGRESS,
    });
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
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

  async getDeliveredOrders(
    limit?: number,
    skip?: number,
  ): Promise<TReturnItem<Order[]>> {
    const query: any = this.orderModel
      .find({ status: EOrderStatus.DELIVERED })
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
      status: EOrderStatus.DELIVERED,
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

  async getAll(limit?: number, skip?: number): Promise<TReturnItem<Order[]>> {
    const query = this.orderModel
      .find({
        status: { $nin: [EOrderStatus.IN_PROGRESS, EOrderStatus.DELIVERED] },
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
      status: { $nin: [EOrderStatus.IN_PROGRESS, EOrderStatus.DELIVERED] },
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
}