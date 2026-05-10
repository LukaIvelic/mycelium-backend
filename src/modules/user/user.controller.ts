import { Body, Controller, ForbiddenException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import type { PublicUserResponse } from './user.mapper';
import { CreateUserDto, UpdateUserDto } from './user.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Errors } from '@/lib/constants/errors';
import {
  ApiCreateUser,
  ApiFindMe,
  ApiGetUser,
  ApiDeleteUser,
  ApiUpdateUser,
} from './user.decorator';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiFindMe()
  findMe(@CurrentUser() userId: string): Promise<PublicUserResponse> {
    return this.userService.findOne(userId);
  }

  @ApiGetUser()
  findOne(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<PublicUserResponse> {
    if (id !== userId) throw new ForbiddenException(Errors.User.NotSelf);
    return this.userService.findOne(id);
  }

  @ApiCreateUser()
  create(@Body() data: CreateUserDto): Promise<PublicUserResponse> {
    return this.userService.create(data);
  }

  @ApiUpdateUser()
  update(
    @Param('id') id: string,
    @Body() data: UpdateUserDto,
    @CurrentUser() userId: string,
  ): Promise<PublicUserResponse> {
    if (id !== userId) throw new ForbiddenException(Errors.User.NotSelf);
    return this.userService.update(id, data);
  }

  @ApiDeleteUser()
  delete(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    if (id !== userId) throw new ForbiddenException(Errors.User.NotSelf);
    return this.userService.delete(id);
  }
}
