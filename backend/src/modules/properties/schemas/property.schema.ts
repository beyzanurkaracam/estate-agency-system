import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PropertyDocument = HydratedDocument<Property>;

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  OFFICE = 'office',
  LAND = 'land',
}

@Schema({ _id: false })
export class Address {
  @Prop({ required: true, trim: true })
  street!: string;

  @Prop({ required: true, trim: true })
  district!: string;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ trim: true })
  postalCode?: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({
  timestamps: true,
  collection: 'properties',
})
export class Property {
  @Prop({ type: AddressSchema, required: true })
  address!: Address;

  @Prop({
    type: String,
    enum: Object.values(PropertyType),
    required: true,
  })
  type!: PropertyType;

  @Prop({ required: true, min: 0 })
  listingPrice!: number;

  @Prop({
    type: String,
    default: 'TRY',
    uppercase: true,
    trim: true,
    match: /^[A-Z]{3}$/,
  })
  currency!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true,
  })
  listedBy!: Types.ObjectId;
}

export const PropertySchema = SchemaFactory.createForClass(Property);

PropertySchema.index({ 'address.city': 1 });
PropertySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});