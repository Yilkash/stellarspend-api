import { Body, Controller, Get, Post, Query, UseGuards, Req, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Delete,
  Patch,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { ExportTransactionsDto } from './dto/export-transactions.dto';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountStatusGuard } from '../../common/guards/account-status.guard';

interface AuthenticatedRequest {
  user?: {
    userId: string;
  };
}

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(JwtAuthGuard, AccountStatusGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Creates a new transaction
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTransactionDto: CreateTransactionDto) {
    const transaction = await this.transactionsService.create(createTransactionDto);
    return {
      success: true,
      data: transaction,
    };
  }

  /**
   * Retrieves paginated list of transactions
   * Supports filtering by userId, category, assetCode, transactionType, and date range
   */
  @Get()
  async findAll(@Query() query: QueryTransactionsDto) {
    const result = await this.transactionsService.findAllPaginated(
      query.page,
      query.limit,
      query.sortOrder,
      {
        userId: query.userId,
        category: query.category,
        assetCode: query.assetCode,
        transactionType: query.transactionType,
        startDate: query.startDate,
        endDate: query.endDate,
      },
    );

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Retrieves a single transaction by ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const transaction = await this.transactionsService.findById(id);
    return {
      success: true,
      data: transaction,
    };
  }

  /**
   * Updates a transaction
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: Partial<CreateTransactionDto>,
  ) {
    const transaction = await this.transactionsService.update(id, updateData);
    return {
      success: true,
      data: transaction,
    };
  }

  /**
   * Deletes a transaction
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.transactionsService.delete(id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export transaction history as CSV' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO 8601 format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO 8601 format)' })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: 200,
    description: 'CSV file containing transaction history',
    content: {
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async export(
    @Query() query: ExportTransactionsDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Parse optional date filters
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    // Generate CSV content
    const csvContent = await this.transactionsService.exportToCsv(userId, startDate, endDate);

    // Set response headers for CSV download
    const filename = `transactions_${userId}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send CSV response
    return res.send(csvContent);
  }
}
