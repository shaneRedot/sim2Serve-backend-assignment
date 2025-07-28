import { ApiProperty } from '@nestjs/swagger';

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Response DTO for Swagger documentation
export class UserResponseDto implements UserResponse {
  @ApiProperty({ 
    description: 'User ID',
    example: 'uuid-string'
  })
  id: string;

  @ApiProperty({ 
    description: 'Email address',
    example: 'john.doe@example.com'
  })
  email: string;

  @ApiProperty({ 
    description: 'Username',
    example: 'johndoe'
  })
  username: string;

  @ApiProperty({ 
    description: 'First name',
    example: 'John',
    required: false
  })
  firstName?: string;

  @ApiProperty({ 
    description: 'Last name',
    example: 'Doe',
    required: false
  })
  lastName?: string;

  @ApiProperty({ 
    description: 'User bio',
    example: 'Software developer passionate about technology',
    required: false
  })
  bio?: string;

  @ApiProperty({ 
    description: 'Account creation date',
    example: '2025-01-15T10:30:00Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Last update date',
    example: '2025-01-20T14:45:00Z'
  })
  updatedAt: Date;
}
