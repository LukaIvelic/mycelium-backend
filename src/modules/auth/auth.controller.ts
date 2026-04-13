import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto, TokenDto } from './auth.dto';
import { ValidateUserRateLimitGuard } from './auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new account and receive a JWT' })
  @ApiResponse({ status: 201, type: TokenDto })
  @ApiResponse({ status: 401, description: 'Email already in use' })
  signup(@Body() dto: SignupDto): Promise<TokenDto> {
    return this.authService.signup(
      dto.first_name, 
      dto.last_name, 
      dto.email, 
      dto.password
    );
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive a JWT' })
  @ApiResponse({ status: 201, type: TokenDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<TokenDto> {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('validate')
  @UseGuards(ValidateUserRateLimitGuard)
  @ApiOperation({ summary: 'Check if an email is already registered' })
  @ApiQuery({ name: 'email', type: 'string', format: 'email' })
  @ApiResponse({ status: 200, description: 'Returns { exists: boolean }' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  validateUser(@Query('email') email: string) {
    return this.authService.validateUser(email);
  }
}
