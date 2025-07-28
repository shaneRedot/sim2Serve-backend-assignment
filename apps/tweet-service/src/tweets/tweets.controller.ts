import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TweetsService } from './tweets.service';
import { CreateTweetDto, UpdateTweetDto } from './dto/tweet.dto';
import { TweetResponse, PaginatedTweetsResponse } from './interfaces/tweet.interface';

@ApiTags('Tweets')
@Controller('tweets')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TweetsController {
  constructor(private readonly tweetsService: TweetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tweet' })
  @ApiResponse({ status: 201, description: 'Tweet created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createTweet(
    @Body() createTweetDto: CreateTweetDto,
    @Request() req: any,
  ): Promise<TweetResponse> {
    return this.tweetsService.createTweet(createTweetDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tweets with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Tweets retrieved successfully' })
  async getAllTweets(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<PaginatedTweetsResponse> {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.tweetsService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tweet by ID' })
  @ApiResponse({ status: 200, description: 'Tweet retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tweet not found' })
  async getTweetById(@Param('id') id: string): Promise<TweetResponse> {
    return this.tweetsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tweet' })
  @ApiResponse({ status: 200, description: 'Tweet updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own tweets' })
  @ApiResponse({ status: 404, description: 'Tweet not found' })
  async updateTweet(
    @Param('id') id: string,
    @Body() updateTweetDto: UpdateTweetDto,
    @Request() req: any,
  ): Promise<TweetResponse> {
    return this.tweetsService.updateTweet(id, updateTweetDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tweet' })
  @ApiResponse({ status: 200, description: 'Tweet deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete own tweets' })
  @ApiResponse({ status: 404, description: 'Tweet not found' })
  async deleteTweet(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    await this.tweetsService.deleteTweet(id, req.user.id);
    return { message: 'Tweet deleted successfully' };
  }
}
