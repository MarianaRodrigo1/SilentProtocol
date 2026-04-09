import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateAgentDto } from './dto/create-agent.dto';
import { ListAgentsQueryDto } from './dto/list-agents-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateAgentStatusDto } from './dto/update-agent-status.dto';
import { AgentsService } from './agents.service';
import type {
  AgentLocationRecord,
  AgentRecord,
  AgentReportSummary,
  AgentWithLastLocation,
  PaginatedItemsResponse,
} from '../common/types/agents';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({
    summary: 'List agents (management view) with optional status filter and last known location.',
  })
  @ApiOkResponse({
    description: 'Paginated list of agents with optional last_location payload.',
  })
  async findAll(@Query() query: ListAgentsQueryDto): Promise<PaginatedItemsResponse<AgentWithLastLocation>> {
    return this.agentsService.getAllWithLastLocation(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new agent (enrollment / management).' })
  @ApiCreatedResponse({ description: 'Agent created.' })
  async create(@Body() createAgentDto: CreateAgentDto): Promise<AgentRecord> {
    return this.agentsService.createAgent(createAgentDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update mission/progress status for one agent (management).' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated agent record.' })
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() payload: UpdateAgentStatusDto,
  ): Promise<AgentRecord> {
    return this.agentsService.updateAgentStatus(id, payload);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get agent mission report summary (read model).' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Agent report summary.' })
  async getSummary(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AgentReportSummary> {
    return this.agentsService.getAgentReportSummary(id);
  }

  @Get(':id/locations')
  @ApiOperation({ summary: 'Get paginated location telemetry for one agent (read model).' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Paginated location telemetry.' })
  async getLocations(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedItemsResponse<AgentLocationRecord>> {
    return this.agentsService.getAgentLocations(id, query);
  }

}
