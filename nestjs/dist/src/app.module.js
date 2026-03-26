"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./controller/app.controller");
const app_controllerRole_1 = require("./controller/app.controllerRole");
const app_controllerPermission_1 = require("./controller/app.controllerPermission");
const app_controllerUpload_1 = require("./controller/app.controllerUpload");
const upload_service_1 = require("./service/upload.service");
const app_service_1 = require("./service/app.service");
const sequelize_1 = require("@nestjs/sequelize");
const app_model_1 = require("./model/app.model");
const app_modelRoles_1 = require("./model/app.modelRoles");
const app_permissions_1 = require("./model/app.permissions");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const cache_manager_redis_store_1 = require("cache-manager-redis-store");
const app_modelproduct_1 = require("./model/app.modelproduct");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env']
            }),
            sequelize_1.SequelizeModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    dialect: 'postgres',
                    host: configService.get('DB_HOST'),
                    port: configService.get('DB_PORT'),
                    username: configService.get('DB_USERNAME'),
                    password: configService.get('DB_PASSWORD'),
                    database: configService.get('DB_NAME'),
                    autoLoadModels: true,
                    synchronize: true
                })
            }),
            sequelize_1.SequelizeModule.forFeature([app_modelRoles_1.Role, app_model_1.Users, app_permissions_1.Permission, app_modelproduct_1.Product]),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.getOrThrow('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.getOrThrow('JWT_EXPIRES')
                    }
                })
            }),
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                useFactory: async () => ({
                    store: await (0, cache_manager_redis_store_1.redisStore)({
                        socket: { host: '127.0.0.1', port: 6379 }
                    }),
                    ttl: 60000
                })
            })
        ],
        controllers: [app_controller_1.AppController, app_controllerRole_1.RoleController, app_controllerPermission_1.permissionController, app_controllerUpload_1.UploadController],
        providers: [app_service_1.AppService, upload_service_1.UploadService]
    })
], AppModule);
//# sourceMappingURL=app.module.js.map