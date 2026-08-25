import { Command } from 'commander';

const program = new Command();

program
  .name('inithium')
  .description('A la carte full-stack monorepo scaffolding CLI')
  .version('0.1.0');

program.parse(process.argv);