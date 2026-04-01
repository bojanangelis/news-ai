import {
  Controller, Post, Get, Delete, Param, Query,
  UploadedFile, UseInterceptors, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('media')
@Controller({ path: 'media', version: '1' })
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Roles('EDITOR', 'WRITER', 'SUPER_ADMIN')
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('altText') altText: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.mediaService.upload(file, altText, user.sub);
  }

  @Roles('EDITOR', 'WRITER', 'SUPER_ADMIN')
  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 40) {
    return this.mediaService.findAll(+page, +limit);
  }

  @Roles('EDITOR', 'SUPER_ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }
}
