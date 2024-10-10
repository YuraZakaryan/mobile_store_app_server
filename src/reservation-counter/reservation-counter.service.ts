import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { OrderItem } from 'src/order/schema/order-item.schema';
import { Product } from 'src/product/product.schema';
import { FindOneParams } from 'src/types';
import { ReservationCounter } from './reservationCounter.schema';

@Injectable()
export class ReservationCounterService {
  constructor(
    @InjectModel(ReservationCounter.name)
    private reservationCounterModel: Model<ReservationCounter>,
    @InjectModel(Product.name)
    private productModel: Model<Product>,
    @InjectModel(OrderItem.name)
    private orderItemModel: Model<OrderItem>,
  ) {}

  async createOrUpdateReservation(
    productId: Types.ObjectId,
    authorId: Types.ObjectId,
    quantity: number,
    orderId: Types.ObjectId,
    forStock?: boolean,
  ): Promise<Types.ObjectId> {
    const product = await this.productModel.findById(productId);

    if (!product) {
      throw new HttpException('product_not_found', HttpStatus.NOT_FOUND);
    }

    const existingReservation = await this.reservationCounterModel.findOne({
      product: productId,
      author: authorId,
      order: orderId,
    });

    if (existingReservation) {
      existingReservation.quantity = quantity;
      existingReservation.reservedAt = new Date();

      await existingReservation.save();

      return existingReservation._id;
    } else {
      const newReservation = await this.reservationCounterModel.create({
        product: productId,
        author: authorId,
        quantity,
        order: orderId,
        forStock: forStock || null,
        reservedAt: new Date(),
        expiresAt: forStock
          ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
          : new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      await newReservation.save();

      product.reservations.push(newReservation._id);
      await product.save();

      return newReservation._id;
    }
  }

  async removeReservation(
    productId: Types.ObjectId,
    authorId: Types.ObjectId,
    orderId: Types.ObjectId,
  ) {
    const product = await this.productModel.findById(productId);

    if (!product) {
      throw new HttpException('product_not_found', HttpStatus.NOT_FOUND);
    }

    const deleteExistingReservation =
      await this.reservationCounterModel.findOneAndDelete({
        product: productId,
        author: authorId,
        order: orderId,
      });

    if (!deleteExistingReservation) {
      console.warn(
        `No conversation found with product and author ID: ${deleteExistingReservation}`,
      );
    }

    if (deleteExistingReservation) {
      await this.removeReservationFromOrderItems(deleteExistingReservation._id);

      const productUpdateResult = await this.productModel.updateOne(
        { _id: productId },
        { $pull: { reservations: deleteExistingReservation._id } },
      );

      if (productUpdateResult.modifiedCount === 0) {
        console.warn(
          `No product found with product ID: ${deleteExistingReservation}`,
        );
      }
    }
  }

  async getUserReservations(userId: Types.ObjectId) {
    const reservations = await this.reservationCounterModel
      .find({
        user: userId,
      })
      .populate('product');

    return reservations;
  }

  async getReservationsByProduct(productId: Types.ObjectId) {
    const reservations = await this.reservationCounterModel.find({
      product: productId,
    });

    if (reservations.length === 0) {
      console.warn(`No reservations found for product ID: ${productId}`);
    }

    return reservations;
  }

  async getReservationByProductAndOrder(
    productId: Types.ObjectId,
    orderId: Types.ObjectId,
  ) {
    const reservation = await this.reservationCounterModel.findOne({
      product: productId,
      order: orderId,
    });

    if (!reservation) {
      console.warn(`No reservations found for product ID: ${productId}`);
    }

    return reservation;
  }

  async removeAllUserReservations(params: FindOneParams) {
    const userId = params.id;

    const reservations = await this.reservationCounterModel.find({
      author: userId,
    });

    if (reservations.length === 0) {
      throw new HttpException('no_reservations_found', HttpStatus.NOT_FOUND);
    }

    for (const reservation of reservations) {
      await this.removeReservationFromOrderItems(reservation._id);

      const productUpdateResult = await this.productModel.updateOne(
        { _id: reservation.product },
        { $pull: { reservations: reservation._id } },
      );

      if (productUpdateResult.modifiedCount === 0) {
        console.warn(
          `No product found or updated with product ID: ${reservation.product} for reservation ID: ${reservation._id}`,
        );
      }

      const deleteResult = await this.reservationCounterModel.deleteOne({
        _id: reservation._id,
      });

      if (deleteResult.deletedCount === 0) {
        console.warn(
          `No reservation found with ID: ${reservation._id} to delete`,
        );
      }
    }
    return reservations;
  }

  async removeReservationByOrderId(orderId: Types.ObjectId) {
    const reservations = await this.reservationCounterModel.find({
      order: orderId,
    });

    if (reservations.length === 0) {
      console.warn(`No reservations found for order ID: ${orderId}`);
      return;
    }

    for (const reservation of reservations) {
      await this.removeReservationFromOrderItems(reservation._id);

      const productUpdateResult = await this.productModel.updateOne(
        { _id: reservation.product },
        { $pull: { reservations: reservation._id } },
      );

      if (productUpdateResult.modifiedCount === 0) {
        console.warn(
          `No product found or updated with product ID: ${reservation.product} for reservation ID: ${reservation._id}`,
        );
      }

      const deleteResult = await this.reservationCounterModel.deleteOne({
        _id: reservation._id,
      });

      if (deleteResult.deletedCount === 0) {
        console.warn(
          `No reservation found with ID: ${reservation._id} to delete`,
        );
      }
    }

    console.log(
      `Successfully removed all reservations for order ID: ${orderId}`,
    );
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async removeExpiredReservations() {
    const now = new Date();
    const expiredReservations = await this.reservationCounterModel.find({
      expiresAt: { $lte: now },
    });

    if (expiredReservations.length === 0) {
      console.warn('No expired reservations found.');
      return;
    }

    for (const reservation of expiredReservations) {
      const relatedOrderItem = await this.orderItemModel.findOne({
        reserved: reservation._id,
      });

      // Check if relatedOrderItem exists and is in progress
      if (relatedOrderItem && relatedOrderItem.inProgress) {
        // Proceed with the removal if inProgress is true
        await this.removeReservationFromOrderItems(reservation._id);

        const productUpdateResult = await this.productModel.updateOne(
          { _id: reservation.product },
          { $pull: { reservations: reservation._id } },
        );

        if (productUpdateResult.modifiedCount === 0) {
          console.warn(
            `No product found or updated with product ID: ${reservation.product} for reservation ID: ${reservation._id}`,
          );
        }

        const deleteResult = await this.reservationCounterModel.deleteOne({
          _id: reservation._id,
        });

        if (deleteResult.deletedCount === 0) {
          console.warn(
            `No reservation found with ID: ${reservation._id} to delete`,
          );
        }
      } else {
        console.warn(
          `Skipping reservation ID: ${reservation._id} as related order item is either not found or not in progress.`,
        );
      }
    }
  }

  async removeReservationFromOrderItems(reservationId: Types.ObjectId) {
    const updateResult = await this.orderItemModel.updateMany(
      { reserved: reservationId },
      { reserved: null },
    );

    if (updateResult.modifiedCount === 0) {
      console.warn(
        `No order items found with reservation ID: ${reservationId}`,
      );
    }
  }
}
