import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SequelizeModule } from "@nestjs/sequelize";
import { Users } from './app.model';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: 'localhost',
      port: 6969,
      username: 'postgres',
      password: 'MinWan',
      database: 'crud_db',
      autoLoadModels: true,
      synchronize: true,
    }),
    SequelizeModule.forFeature([Users]),
    JwtModule.register({
      secret: 'YOUR_SECRET_KEY',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
