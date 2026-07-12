#!/usr/bin/env node
import { runCreatorCli } from "../src/creator/cli.js";

process.exitCode = await runCreatorCli(process.argv.slice(2));
