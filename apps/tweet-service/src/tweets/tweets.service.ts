import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Tweet } from '../entities/tweet.entity';
import { firstValueFrom } from 'rxjs';
import { CreateTweetDto, UpdateTweetDto } from './dto/tweet.dto';
import { TweetResponse, PaginatedTweetsResponse } from './interfaces/tweet.interface';

@Injectable()
export class TweetsService {
  constructor(
    @InjectRepository(Tweet)
    private readonly tweetRepository: Repository<Tweet>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createTweet(createTweetDto: CreateTweetDto, authorId: string): Promise<TweetResponse> {
    // Get user info from user service
    const userInfo = await this.getUserInfo(authorId);

    const tweet = this.tweetRepository.create({
      content: createTweetDto.content,
      authorId,
    });

    const savedTweet = await this.tweetRepository.save(tweet);

    return {
      id: savedTweet.id,
      content: savedTweet.content,
      authorId: savedTweet.authorId,
      author: userInfo,
      createdAt: savedTweet.createdAt,
      updatedAt: savedTweet.updatedAt,
    };
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedTweetsResponse> {
    const [tweets, total] = await this.tweetRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    // Get user info for all tweets
    const tweetsWithAuthors = await Promise.all(
      tweets.map(async (tweet) => {
        const userInfo = await this.getUserInfo(tweet.authorId);
        return {
          id: tweet.id,
          content: tweet.content,
          authorId: tweet.authorId,
          author: userInfo,
          createdAt: tweet.createdAt,
          updatedAt: tweet.updatedAt,
        };
      }),
    );

    return {
      tweets: tweetsWithAuthors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<TweetResponse> {
    const tweet = await this.tweetRepository.findOne({ where: { id } });
    if (!tweet) {
      throw new NotFoundException('Tweet not found');
    }

    const userInfo = await this.getUserInfo(tweet.authorId);

    return {
      id: tweet.id,
      content: tweet.content,
      authorId: tweet.authorId,
      author: userInfo,
      createdAt: tweet.createdAt,
      updatedAt: tweet.updatedAt,
    };
  }

  async updateTweet(id: string, updateTweetDto: UpdateTweetDto, userId: string): Promise<TweetResponse> {
    const tweet = await this.tweetRepository.findOne({ where: { id } });
    if (!tweet) {
      throw new NotFoundException('Tweet not found');
    }

    if (tweet.authorId !== userId) {
      throw new ForbiddenException('You can only update your own tweets');
    }

    tweet.content = updateTweetDto.content;
    const updatedTweet = await this.tweetRepository.save(tweet);

    const userInfo = await this.getUserInfo(tweet.authorId);

    return {
      id: updatedTweet.id,
      content: updatedTweet.content,
      authorId: updatedTweet.authorId,
      author: userInfo,
      createdAt: updatedTweet.createdAt,
      updatedAt: updatedTweet.updatedAt,
    };
  }

  async deleteTweet(id: string, userId: string): Promise<void> {
    const tweet = await this.tweetRepository.findOne({ where: { id } });
    if (!tweet) {
      throw new NotFoundException('Tweet not found');
    }

    if (tweet.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own tweets');
    }

    await this.tweetRepository.remove(tweet);
  }

  private async getUserInfo(userId: string): Promise<any> {
    try {
      const userServiceUrl = this.configService.get<string>('USER_SERVICE_URL');
      const response = await firstValueFrom(
        this.httpService.get(`${userServiceUrl}/users/${userId}`),
      );
      
      const userData = response.data as any;
      return {
        id: userData.id,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
      };
    } catch (error) {
      return {
        id: userId,
        username: 'Unknown User',
        firstName: null,
        lastName: null,
      };
    }
  }
}
