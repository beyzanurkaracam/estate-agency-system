// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { envValidationSchema } from './config/env.validation';
import { AgentsModule } from './modules/agents.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [
    // Config — .env'i oku ve validate et
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,  // Tüm env hatalarını topla, ilkinde durma
      },
    }),

    // MongoDB — async çünkü MONGODB_URI config'ten geliyor
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),

    // Feature modules
    AgentsModule,
    PropertiesModule,
    TransactionsModule,
  ],
})
export class AppModule {}