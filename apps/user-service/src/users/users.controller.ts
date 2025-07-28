import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/user.dto';
import { UserResponse, UserResponseDto } from './interfaces/user.interface';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    type: UserResponseDto
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile updated successfully',
    type: UserResponseDto
  })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ): Promise<UserResponse> {
    return this.usersService.updateUser(id, updateUserDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user profile' })
  @ApiResponse({ status: 200, description: 'User profile deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    await this.usersService.deleteUser(id, req.user.id);
    return { message: 'User deleted successfully' };
  }
}
