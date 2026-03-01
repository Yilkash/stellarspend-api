import { Controller, Get, Param } from '@nestjs/common';
import { WalletService, AssetBalance } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Get()
  status() {
    return this.walletService.getStatus();
  }

  @Get(':publicKey/balances')
  async fetchAccountBalances(
    @Param('publicKey') publicKey: string,
  ): Promise<{ publicKey: string; balances: AssetBalance[] }> {
    const balances = await this.walletService.getAccountBalances(publicKey);
    return { publicKey, balances };
  }
}