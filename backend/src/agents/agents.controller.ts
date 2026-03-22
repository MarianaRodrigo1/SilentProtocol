import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateAgentDto } from './dto/create-agent.dto';
import { GetAgentTelemetryQueryDto } from './dto/get-agent-telemetry-query.dto';
import { GetAgentsQueryDto } from './dto/get-agents-query.dto';
import { UpdateAgentStatusDto } from './dto/update-agent-status.dto';
import { AgentsService } from './agents.service';
import {
  AgentBluetoothScanRecord,
  AgentContactLeakRecord,
  AgentLocationRecord,
  AgentRecord,
  AgentReportSummary,
  AgentVisualEvidenceRecord,
  AgentWithLastLocation,
  PaginatedItemsResponse,
} from './agents.types';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'List agents with optional status filter and last known location.' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'MISSION_ACTIVE', 'MISSION_COMPLETE'] })
  @ApiOkResponse({
    description: 'Paginated list of agents with optional last_location payload.',
  })
  async findAll(
    @Query() query: GetAgentsQueryDto,
  ): Promise<PaginatedItemsResponse<AgentWithLastLocation>> {
    return this.agentsService.getAllWithLastLocation(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new agent profile.' })
  @ApiCreatedResponse({ description: 'Agent created.' })
  async create(@Body() createAgentDto: CreateAgentDto): Promise<AgentRecord> {
    return this.agentsService.createAgent(createAgentDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update mission status for one agent.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated agent record.' })
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() payload: UpdateAgentStatusDto,
  ): Promise<AgentRecord> {
    return this.agentsService.updateAgentStatus(id, payload);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get mission summary with counts and last location.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Agent report summary.' })
  async getSummary(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AgentReportSummary> {
    return this.agentsService.getAgentReportSummary(id);
  }

  @Get(':id/locations')
  @ApiOperation({ summary: 'Get paginated location telemetry for one agent.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated location telemetry.' })
  async getLocations(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: GetAgentTelemetryQueryDto,
  ): Promise<PaginatedItemsResponse<AgentLocationRecord>> {
    return this.agentsService.getAgentLocations(id, query);
  }

  @Get(':id/bluetooth-scans')
  @ApiOperation({ summary: 'Get paginated bluetooth scans for one agent.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated bluetooth scans.' })
  async getBluetoothScans(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: GetAgentTelemetryQueryDto,
  ): Promise<PaginatedItemsResponse<AgentBluetoothScanRecord>> {
    return this.agentsService.getAgentBluetoothScans(id, query);
  }

  @Get(':id/contacts-leaks')
  @ApiOperation({ summary: 'Get paginated contacts leak entries for one agent.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated contacts leak entries.' })
  async getContactsLeaks(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: GetAgentTelemetryQueryDto,
  ): Promise<PaginatedItemsResponse<AgentContactLeakRecord>> {
    return this.agentsService.getAgentContactsLeaks(id, query);
  }

  @Get(':id/visual-evidence')
  @ApiOperation({ summary: 'Get paginated visual evidence entries for one agent.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paginated visual evidence entries.' })
  async getVisualEvidence(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: GetAgentTelemetryQueryDto,
  ): Promise<PaginatedItemsResponse<AgentVisualEvidenceRecord>> {
    return this.agentsService.getAgentVisualEvidence(id, query);
  }
}
