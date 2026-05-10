import { Body, Controller, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiLogin,
  ApiSignup,
  ApiToken,
  ApiValidateUser,
} from './auth.decorator';
import { LoginDto, OAuthTokenDto, SignupDto, TokenDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('authentication')
@Controller('authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiSignup()
  signup(@Body() dto: SignupDto): Promise<TokenDto> {
    return this.authService.signup(
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.password,
    );
  }

  @ApiLogin()
  login(@Body() dto: LoginDto): Promise<TokenDto> {
    return this.authService.login(dto.email, dto.password);
  }

  @ApiToken()
  async token(
    @Body() body: { username: string; password: string },
  ): Promise<OAuthTokenDto> {
    const { accessToken } = await this.authService.login(
      body.username,
      body.password,
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
    };
  }

  @ApiValidateUser()
  validateUser(@Query('email') email: string) {
    return this.authService.validateUser(email);
  }
}
