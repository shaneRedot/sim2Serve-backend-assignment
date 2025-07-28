import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTweetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(280, { message: 'Tweet content cannot exceed 280 characters' })
  content: string;
}

export class UpdateTweetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(280, { message: 'Tweet content cannot exceed 280 characters' })
  content: string;
}
