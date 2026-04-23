import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RegisterServiceDto {
  @ApiProperty({ example: 'http://localhost:3002' })
  @IsString()
  serviceOrigin: string;

  @ApiProperty({ required: false, nullable: true, example: 'orders-service' })
  @IsOptional()
  @IsString()
  serviceKey?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Orders Service',
  })
  @IsOptional()
  @IsString()
  serviceName?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '1.2.0' })
  @IsOptional()
  @IsString()
  serviceVersion?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Processes order workflows',
  })
  @IsOptional()
  @IsString()
  serviceDescription?: string | null;
}
