# Lambda-wrk2

The Command to run [`wrk2`](https://github.com/giltene/wrk2) on [`AWS Lambda`](https://aws.amazon.com/jp/lambda/). 

> ⚠️ `Lambda-wrk2` is for load testing. Do not use `Lambda-wrk2` to attack. Authors do not warrant any damages resulting from it. Please use one for your own responsibility.


![Huge rolling wave](docs/austin-schmid-_rThRCcLV6U-unsplash_modified.jpg?raw=true)

<span>Photo by <a href="https://unsplash.com/@schmidy?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Austin Schmid</a> on <a href="https://unsplash.com/s/photos/wave?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a></span>

## Table of Contents

* Features
* Setup
* Usage
* Development
* License

## Features

* Run wrk2 in parallel on AWS Lambda.
* Control wrk2 [`lua` scripts](https://github.com/giltene/wrk2/tree/master/scripts).

## Setup

### Requirements

* [Node.js](https://nodejs.org/en/) v14.15.3, npm 6.14.9
* [Docker](https://www.docker.com/) version 19.03.12, build 48a66213fe
* [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
* [AWS IAM User Credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html) 

### 1. Set environment variables

Copy `.env.sample` to `.env`.

```sh
$ cp .env.sample .env
```

Then, set environment variables in `.env`. For more information, see comments in [`.env.sample`](.env.sample).

### 2. Create AWS resources

Run setup command and enter `y` when being confirmed to create AWS stack.

```sh
# Run setup command.
$ ./lambdawrk2 setup
```

The outputs look like this.

```sh
Cloning into '/Users/.../lambda-wrk2/wrk2-cmd/docker/wrk2'...
remote: Enumerating objects: 1053, done.
remote: Total 1053 (delta 0), reused 0 (delta 0), pack-reused 1053
...

added 187 packages from 262 contributors and audited 188 packages in 4.05s

25 packages are looking for funding
  run `npm fund` for details
...

> aws@0.1.0 build /Users/.../lambda-wrk2/aws-cdk
> tsc

This deployment will make potentially sensitive changes according to your current security approval level (--require-approval broadening).
Please confirm you intend to make the following modifications:

IAM Statement Changes
┌───┬──────────────────────────────────────────────────────────┬────────┬──────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────┬───────────┐
│   │ Resource                                                 │ Effect │ Action                                                                   │ Principal                                   │ Condition │
├───┼──────────────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┼───────────┤
│ + │ ${TestStack-DockerFunction/ServiceRole.Arn}              │ Allow  │ sts:AssumeRole                                                           │ Service:lambda.amazonaws.com                │           │
...
```

```sh
# Enter `y` when being confirmed to create AWS stack.
Do you wish to deploy these changes (y/n)? y
```

```sh
TestStack: deploying...
[0%] start: Publishing 8e85dbadda9a3fb477815b4430401402b136e99d6c6991db630c4d96e638b9b0:current
...
[100%] success: Published 8e85dbadda9a3fb477815b4430401402b136e99d6c6991db630c4d96e638b9b0:current
TestStack: creating CloudFormation changeset...
[██████████████████████████████████████████████████████████] (6/6)
...
 ✅  TestStack
...
Outputs:
TestStack.BucketName = ...
TestStack.LambdaArn = arn:aws:lambda:...

Stack ARN:
arn:aws:cloudformation:ap-northeast-1:...
```

## Usage

### 1. Set environment variables.

Set environment variables related to `wrk2` in `.env`.

```
PARALLEL_COUNT=2, WRK2_THREAD=2, WRK2_CONNECTION=2...
```

For more information, see comments in [`.env.sample`](.env.sample) and [`wrk2` README](https://github.com/giltene/wrk2).

### 2. Set wrk2 script

Set request properties in wrk2 `lua` script and script file path to `.env`.  
The script examples is in `wrk2-cmd/script/wrk2`. For more information, see  [`wrk2 scripts`](https://github.com/giltene/wrk2/trae/master/scripts).

### 3. Run wrk2

Run wrk2 on Lambda.

```
# Run
./lambda-wrk2 run
```

The outputs look like this.

```sh
> wrk2-cmd@1.0.0 build /Users/.../lambda-wrk2/wrk2-cmd/script
> tsc src/index.ts
...

> wrk2-cmd@1.0.0 start /Users/.../prj/lambda-wrk2/wrk2-cmd/script
> node src/index.js --aws_stackname=$npm_config_aws_stackname ...
...

✔ getting stack props
✔ update Lambda environment variables
✔ upload wrk2 script file
✔ invoked each Lambda
✔ waiting for each Lambda to end, they will output results in teststack-teststackworkbucket69bf4ac9-14ou8wvykgxbf bucket
✔ download results
🦄 done. check results in /Users/.../lambda-wrk2/output/20201221093901/result
```

### 4. Check results

Results are in a directory, which is set in `.env`.

```
20201221093901
6bb06529-8fe0-4eb4-991e-428dc8376757
run ./wrk -t2 -c2 -d5s -R1 -s /tmp/get.lua -T 5 --latency https://....herokuapp.com
Running 5s test @ https://....herokuapp.com
  2 threads and 2 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     -nanus    -nanus   0.00us    0.00%
    Req/Sec       -nan      -nan   0.00      0.00%
  Latency Distribution (HdrHistogram - Recorded Latency)
 50.000%    0.00us
...
```

## Development

### Tech stacks

* AWS: Lambda, S3, CloudWatch, CDK
* TypeScript, Bash
* wrk2

### Setup

[Setup](#setup) installs required resources.

### Structure

* AWS CDK for creating AWS resources.
* AWS SDK for controlling to execute Lambda.
* Lambda runs `wrk2` docker container image.

#### Design

WIP

#### Sources

WIP

## Get in touch

- [Dev.to](https://dev.to/takakd)
- [Twitter](https://twitter.com/takakdkd)

## Contributing

Welcome to issues and reviews. Don't hesitate to create issues and PR.

## License

- **[MIT license](http://opensource.org/licenses/mit-license.php)**
- Copyright 2020 © takakd.