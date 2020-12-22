<p align="center"><img src="docs/logo.svg" width="80"/></p>
<h1 align="center">Lambda-wrk2</h1>

<p align="center">Run <a href="https://github.com/giltene/wrk2">wrk2</a> on <a href="https://aws.amazon.com/jp/lambda/">AWS Lambda</a>.</p>

<p align="center">
<a target="_blank" rel="noopener noreferrer" href="https://camo.githubusercontent.com/a568b3692dcc72af17d4abfed1b2c81d47f05dcaaefb021c9f9d3d6a856d3e6e/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4c6963656e73652d4d49542d696e666f726d6174696f6e616c3f7374796c653d666c6174"><img src="https://camo.githubusercontent.com/a568b3692dcc72af17d4abfed1b2c81d47f05dcaaefb021c9f9d3d6a856d3e6e/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4c6963656e73652d4d49542d696e666f726d6174696f6e616c3f7374796c653d666c6174" alt="License-MIT" data-canonical-src="https://img.shields.io/badge/License-MIT-informational?style=flat" style="max-width:100%;"></a>
</p>

> ⚠️ `Lambda-wrk2` is for load testing. Do not use `Lambda-wrk2` to attack. Authors do not warrant any damages resulting from it. Please use one for your own responsibility.

<br>

## Table of Contents

- [Features](#features)
- [Setup](#setup)
- [Usage](#usage)
- [Development](#development)
- [License](#license)

## Features

* Run wrk2 in parallel on AWS Lambda.
* Control wrk2 [lua scripts](https://github.com/giltene/wrk2/tree/master/scripts).

## Setup

### Requirements

* macOS 10.15.5
* [Node.js](https://nodejs.org/en/) v14.15.3, npm 6.14.9
* [Docker](https://www.docker.com/) version 19.03.12, build 48a66213fe
* [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) 1.78.0 (build 2c74f4c)
* [AWS IAM user credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html) 


### 1. Create IAM user

Create IAM user attached following settings in your AWS Account.

#### IAM user setting

* Allow programmatic access.
* Attach policies by [lambda-wrk2-policy.json](aws-cdk/lambda-wrk2-policy.json).

### 2. Set environment variables

Copy `.env.example` to `.env`.

```sh
$ cp .env.sample .env
```

Then, set environment variables in `.env`. For more information, see comments in [`.env.example`](.env.example).

### 3. Create AWS resources

Run setup command and enter `y` when asked to create AWS stack.

```sh
# Run setup command.
$ ./lambdawrk2 setup
```

The outputs will look like this.

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
# Enter `y` when asked to create AWS stack.
Do you wish to deploy these changes (y/n)? y
```

```sh
TestStack: deploying...
[0%] start: Publishing XXXXXXXXXX9a3fb477815b4430401402b136e99d6c6991db630c4d96e638b9b0:current
...
[100%] success: Published XXXXXXXXXX9a3fb477815b4430401402b136e99d6c6991db630c4d96e638b9b0:current
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

### 1. Set environment variables

Set environment variables in `.env`.

```
PARALLEL_COUNT=2, WRK2_THREAD=2, WRK2_CONNECTION=2...
```

For more information, see comments in [`.env.example`](.env.example) and [`wrk2` README](https://github.com/giltene/wrk2).

### 2. Set wrk2 script

Set request properties in wrk2 `lua` script and it's file path to `.env`.  
The script examples is in `wrk2-cmd/script/wrk2`. For more information, see  [`wrk2 scripts`](https://github.com/giltene/wrk2/tree/master/scripts).

### 3. Run wrk2

Run wrk2 on Lambda.

```
# Run
./lambda-wrk2 run
```

The outputs will look like this.

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
✔ waiting for each Lambda to end, they will output results in xxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx bucket
✔ download results
🦄 done. check results in /Users/.../lambda-wrk2/output/20201221093901/result
```

### 4. Check results

Results will be in a directory which path is set at `OUTPUT_DIR_PATH` in `.env`.

**e.g. xxxxxxxx-8fe0-xxxx-991e-428dc8376757.txt**
```
20201221093901
xxxxxxxx-8fe0-xxxx-991e-428dc8376757
run ./wrk -t2 -c2 -d5s -R1 -s /tmp/get.lua -T 5 --latency https://...herokuapp.com
Running 5s test @ https://...herokuapp.com
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
* Node.js, Docker
* TypeScript, Bash
* wrk2

### Setup

[Setup](#setup) installs all required resources.

### Structure

* AWS CDK creates AWS resources.
* AWS SDK controls to execute Lambda.
* Lambda runs `wrk2` docker container image.

#### Design

![Design](docs/design.jpg?raw=true)

#### Sources

```sh
.
|-- .env.example        <-- Environment variables examples
|-- .gitignore
|-- LICENSE
|-- README.md
|-- aws-cdk             <-- AWS CDK Kit with TypeScrpit
|   |-- .eslintrc.js
|   |-- .gitignore
|   |-- .npmignore      
|   |-- .prettierrc.js
|   |-- README.md
|   |-- bin
|   |   `-- aws.ts          <-- CDK entrypoint script
|   |-- cdk.json            <-- CDK setting
|   |-- jest.config.js
|   |-- lambda-wrk2-policy.json     <-- IAM user policy
|   |-- lib                         <-- Fragments of CDK script
|   |   `-- lambda-wrk2-service.ts  <-- lambda-wrk2 Stack CDK script
|   |-- package.json
|   |-- test                <-- Jest scripts 
|   `-- tsconfig.json
|
|-- docs
|-- lambdawrk2      <-- lamda-wrk2 command script
|-- output          <-- Output directory for results
`-- wrk2-cmd            <-- wrk2 assets
    |
    |-- docker              <-- Docker image files to run on Lambda
    |   |-- Dockerfile
    |   |-- function.sh     <-- Script to run on a docker container
    |   `-- wrk2            <-- wrk2 GitHub clone
    |
    `-- script
        |-- .eslintrc.js
        |-- .prettierrc.js
        |-- package.json
        |-- tsconfig.json
        |
        |-- src         <-- Fragments of script to use in lambdawrk2 command.
        |   |-- index.ts
        |   `-- wrk2cmd.ts 
        |
        `-- wrk2        <-- wrk2 lua scripts
            |-- post.example.lua
            `-- get.example.lua
```

## Get in touch

- [Dev.to](https://dev.to/takakd)
- [Twitter](https://twitter.com/takakdkd)

## Contributing

Issues and reviews are welcome. Don't hesitate to create issues and PR.

## License

- `wrk2` license is [here](https://github.com/giltene/wrk2)
- Lambda-wrk2 license is **[MIT license](http://opensource.org/licenses/mit-license.php)**
- Copyright 2020 © takakd.

