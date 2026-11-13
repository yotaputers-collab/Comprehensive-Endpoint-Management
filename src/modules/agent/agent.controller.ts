import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { AgentService } from './agent.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { EnrollAgentDto } from './dto/enroll-agent.dto';
import { HeartbeatAgentDto } from './dto/heartbeat-agent.dto';
import { ReportInventoryDto } from './dto/report-inventory.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /** Agent bootstrap: authenticated by the shared enrolment token, not a user. */
  @Public()
  @Post('enroll')
  @HttpCode(201)
  enroll(@Body() dto: EnrollAgentDto, @Headers('x-enroll-token') enrollToken?: string) {
    return this.agentService.enroll(dto, enrollToken);
  }

  /** Agent liveness; authenticated by the token issued at enrolment. */
  @Public()
  @Post(':id/heartbeat')
  @HttpCode(200)
  heartbeat(
    @Param('id') id: string,
    @Body() dto: HeartbeatAgentDto,
    @Headers('x-agent-token') agentToken?: string,
  ) {
    return this.agentService.heartbeat(id, agentToken, dto);
  }

  /** Full software snapshot; replaces the previous report for this host. */
  @Public()
  @Post(':id/inventory')
  @HttpCode(202)
  reportInventory(
    @Param('id') id: string,
    @Body() dto: ReportInventoryDto,
    @Headers('x-agent-token') agentToken?: string,
  ) {
    return this.agentService.reportInventory(id, agentToken, dto);
  }

  @Get()
  findAll() {
    return this.agentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  @Get(':id/software')
  listSoftware(@Param('id') id: string) {
    return this.agentService.listSoftware(id);
  }

  @Roles('admin', 'operator')
  @Post()
  create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentService.create(createAgentDto);
  }

  @Roles('admin', 'operator')
  @Post(':id')
  update(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
    return this.agentService.update(id, updateAgentDto);
  }

  @Roles('admin', 'operator')
  @Post(':id/deploy')
  deploy(@Param('id') id: string) {
    return this.agentService.deploy(id);
  }

  @Roles('admin', 'operator')
  @Post(':id/collect-data')
  collectData(@Param('id') id: string) {
    return this.agentService.collectData(id);
  }

  @Roles('admin')
  @Delete(':id')
  @HttpCode(200)
  decommission(@Param('id') id: string) {
    return this.agentService.decommission(id);
  }
}
