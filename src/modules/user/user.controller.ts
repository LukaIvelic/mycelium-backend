import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './user.dto';
import {
  ApiCreateUser,
  ApiGetUser,
  ApiInvalidateUser,
  ApiUpdateUser,
} from './user.decorator';
import { JwtGuard } from '../auth/jwt.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiGetUser()
  findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Post()
  @ApiCreateUser()
  create(@Body() data: CreateUserDto): Promise<User> {
    return this.userService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @ApiUpdateUser()
  update(@Param('id') id: string, @Body() data: UpdateUserDto): Promise<User> {
    return this.userService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @ApiInvalidateUser()
  invalidate(@Param('id') id: string): Promise<void> {
    return this.userService.invalidate(id);
  }
}
