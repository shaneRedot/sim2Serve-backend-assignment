import { ApiProperty } from '@nestjs/swagger';

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}

// Response DTO for Swagger documentation
export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ 
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  access_token: string;

  @ApiProperty({ 
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'uuid-string' },
      email: { type: 'string', example: 'john.doe@example.com' },
      username: { type: 'string', example: 'johndoe' },
      firstName: { type: 'string', example: 'John' },
      lastName: { type: 'string', example: 'Doe' }
    }
  })
  user: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}
