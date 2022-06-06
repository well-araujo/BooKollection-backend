import { Field, InputType } from '@nestjs/graphql';
import { Language } from '@shared/enum';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class CreateInternationalizationInput {
  @Field()
  @IsNotEmpty()
  language: Language;

  @Field()
  @IsNotEmpty()
  synopsis: string;

  @Field()
  @IsNotEmpty()
  edition: string;

  @Field()
  @IsNotEmpty()
  type: string;

  @Field()
  @IsNotEmpty()
  paperType: string;

  @Field()
  @IsNotEmpty()
  country: string;
}
