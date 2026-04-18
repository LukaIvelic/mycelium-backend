import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOAuth2, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { ProjectService } from '../project/project.service';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly projectService: ProjectService
  ) {}

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiOAuth2([])
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  findMe(@Req() request: Request): Promise<User> {
    const { sub } = request['user'] as { sub: string };
    return this.userService.findOne(sub);
  }

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

  @Get(':id/projects')
  @UseGuards(JwtGuard)
  @ApiOAuth2([])
  @ApiOperation({ summary: 'Get all projects for a user' })
  findProjects(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.findByUserId(id);
  }
}
