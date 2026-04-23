// src/modules/agents/schemas/agent.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AgentDocument = HydratedDocument<Agent>;

@Schema({
  timestamps: true,   // createdAt, updatedAt otomatik
  collection: 'agents',
})
export class Agent {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  })
  email!: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ default: true })
  active!: boolean;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);

// toJSON transform — _id yerine id, __v'yi gizle
AgentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});