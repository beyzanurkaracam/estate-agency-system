import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';  
import { AgentsService } from '../agents/agents.service';
import {
  Property,
  PropertyDocument,
  PropertyType,
} from './schemas/property.schema';
import { CreatePropertyDto } from './dto/create-property.dto';

export interface PropertyListFilters {
  city?: string;
  type?: PropertyType;
  listedBy?: string;
}

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    private readonly agentsService: AgentsService,
  ) {}

  async create(dto: CreatePropertyDto): Promise<PropertyDocument> {
    const agent = await this.agentsService.findById(dto.listedBy);
    if (!agent.active) {
      throw new BadRequestException(
        `Listing agent "${agent.name}" is inactive`,
      );
    }

    const property = await this.propertyModel.create({
      ...dto,
      listedBy: new Types.ObjectId(dto.listedBy),
    });
    return property;
  }

  async findAll(filters: PropertyListFilters = {}): Promise<PropertyDocument[]> {
    const query: Record<string, any> = {};  
    if (filters.city) query['address.city'] = filters.city;
    if (filters.type) query.type = filters.type;
    if (filters.listedBy) query.listedBy = new Types.ObjectId(filters.listedBy);

    return this.propertyModel
      .find(query)
      .populate('listedBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<PropertyDocument> {
    const property = await this.propertyModel
      .findById(id)
      .populate('listedBy', 'name email phone active')
      .exec();
    if (!property) {
      throw new NotFoundException(`Property not found: ${id}`);
    }
    return property;
  }

  async remove(id: string): Promise<void> {
    const property = await this.propertyModel.findByIdAndDelete(id).exec();
    if (!property) {
      throw new NotFoundException(`Property not found: ${id}`);
    }
  }

  async update(
    id: string,
    dto: CreatePropertyDto,
  ): Promise<PropertyDocument> {
    if (dto.listedBy) {
      const agent = await this.agentsService.findById(dto.listedBy);
      if (!agent.active) {
        throw new BadRequestException(
          `Listing agent "${agent.name}" is inactive`,
        );
      }
    }

    const property = await this.propertyModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .populate('listedBy', 'name email')
      .exec();

    if (!property) {
      throw new NotFoundException(`Property not found: ${id}`);
    }
    return property;
  }
}