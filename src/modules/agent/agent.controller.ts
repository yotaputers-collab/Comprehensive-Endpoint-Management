import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AgentService } from './agent.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { Roles } from '../../auth/roles.decorator';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Roles('admin', 'operator')
  @Post()
  create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentService.create(createAgentDto);
  }

  @Get()
  findAll() {
    return this.agentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
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
}