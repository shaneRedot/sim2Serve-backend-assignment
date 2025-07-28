import { IsOptional, IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ 
    description: 'Username',
    minLength: 3,
    example: 'johndoe_updated'
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiPropertyOptional({ 
    description: 'Email address',
    example: 'john.updated@example.com'
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ 
    description: 'First name',
    example: 'John'
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ 
    description: 'Last name',
    example: 'Doe'
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ 
    description: 'User bio/description',
    maxLength: 500,
    example: 'Software developer passionate about technology'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
