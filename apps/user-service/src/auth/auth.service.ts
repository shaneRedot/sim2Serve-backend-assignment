import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthResponse, JwtPayload } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { username, email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new UnauthorizedException('User with this email or username already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      username,
      email,
      passwordHash,
      firstName,
      lastName,
    });

    const savedUser = await this.userRepository.save(user);

    const payload: JwtPayload = {
      sub: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
    };

    const accessToken = this.jwtService.sign(payload);

    const { id, username: savedUsername, email: savedEmail, firstName: savedFirstName, lastName: savedLastName } = savedUser;
    return {
      access_token: accessToken,
      user: {
        id,
        username: savedUsername,
        email: savedEmail,
        firstName: savedFirstName,
        lastName: savedLastName,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    const { id, username: userUsername, email: userEmail, firstName, lastName } = user;
    return {
      access_token: accessToken,
      user: {
        id,
        username: userUsername,
        email: userEmail,
        firstName,
        lastName,
      },
    };
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    return user || null;
  }
}
