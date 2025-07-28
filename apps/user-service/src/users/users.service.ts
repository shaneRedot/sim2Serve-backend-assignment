import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateUserDto } from './dto/user.dto';
import { UserResponse } from './interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<UserResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'firstName', 'lastName', 'bio', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto, currentUserId: string): Promise<UserResponse> {
    if (id !== currentUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if new username or email already exists (if provided)
    if (updateUserDto.username || updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: [
          ...(updateUserDto.username ? [{ username: updateUserDto.username }] : []),
          ...(updateUserDto.email ? [{ email: updateUserDto.email }] : []),
        ],
      });

      if (existingUser && existingUser.id !== id) {
        throw new ForbiddenException('Username or email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    const { 
      id: userId, 
      username, 
      email, 
      firstName, 
      lastName, 
      bio, 
      createdAt, 
      updatedAt 
    } = updatedUser;
    
    return {
      id: userId,
      username,
      email,
      firstName,
      lastName,
      bio,
      createdAt,
      updatedAt,
    };
  }

  async deleteUser(id: string, currentUserId: string): Promise<void> {
    if (id !== currentUserId) {
      throw new ForbiddenException('You can only delete your own profile');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);
  }
}
