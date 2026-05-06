import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot(): { message: string; stage: string } {
    return {
      message: 'PromoCode Manager backend foundation is running.',
      stage: 'stage-2'
    };
  }
}
