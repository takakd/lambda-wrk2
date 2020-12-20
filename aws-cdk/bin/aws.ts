#!/usr/bin/env node
import path = require("path");
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import {LambdaWrk2Service} from "../lib/lambda-wrk2-service";

// Validate environment variables.
if (!process.env.AWS_STACK_NAME) {
    throw new Error('error AWS_STACK_NAME is undefined')
}

// Start creating Stack.
const app = new cdk.App();
new LambdaWrk2Service(app, process.env.AWS_STACK_NAME, {
    dockerfilePath: path.join(__dirname, "../../wrk2-cmd/docker"),
});
app.synth();
