import AWS = require('aws-sdk');
import path = require('path');
import fs = require('fs');
import util = require('util');
import minimist = require('minimist');
import ora = require('ora');
import { readFileSync } from 'fs';

// Key names of AWS CloudFormation Stack Outputs.
// These keys should match keys in cdk scripts.
const AWSStackOutputKeyBucket = 'BucketName';
const AWSStackOutputKeyLambda = 'LambdaArn';

/**
 * Command arguments
 */
export class Argv {
    /**
     * The CloudFormation stack name in AWS.
     */
    readonly awsStackName: string = '';

    /**
     * Profile name in ~/.aws/.credentials executing this command.
     */
    readonly awsProfile?: string = '';

    /**
     * The region in which AWS resources are deployed.
     */
    readonly awsRegion: string = '';

    /**
     * AWS ACCESSKEY of IAM user executing this command.
     */
    readonly awsAccessKey?: string = '';

    /**
     * AWS ACCESSKEY SECRET of IAM user executing this command.
     */
    readonly awsSecret?: string = '';

    /**
     * Concurrency number.
     * Invoke Lambda for this number.
     * {@link https://github.com/giltene/wrk2}
     */
    readonly parallel: number = 0;

    /**
     * Directory to be output results.
     */
    readonly outputDirPath: string = '';

    /**
     * wrk2 thread option.
     * {@link https://github.com/giltene/wrk2}
     */
    readonly wrk2Thread: number = 0;

    /**
     * wrk2 connection option.
     * {@link https://github.com/giltene/wrk2}
     */
    readonly wrk2Connection: number = 0;

    /**
     * wrk2 duration option.
     * {@link https://github.com/giltene/wrk2}
     */
    readonly wrk2Duration: string = '';

    /**
     * wrk2 request per sec option.
     * {@link https://github.com/giltene/wrk2}
     */
    readonly wrk2ReqPerSec: number = 0;

    /**
     * wrk2 timeout option.
     * {@link https://github.com/giltene/wrk2}
     */
    readonly wrk2Timeout: number = 0;

    /**
     * wrk2 request URL.
     * {@link https://github.com/giltene/wrk2}
     */
    readonly wrk2Url: number = 0;

    /**
     * wrk2 script .lua file.
     * {@link https://github.com/giltene/wrk2}
     */
    readonly wrk2ScriptPath: string = '';

    /**
     * @param {string[]} argv pass process.argv
     */
    constructor(argv: string[]) {
        const argvMap = minimist(argv.slice(2));

        // Require AccessKey and Secret, or Profile
        this.awsAccessKey = argvMap.aws_key || '';
        this.awsSecret = argvMap.aws_secret || '';
        this.awsProfile = argvMap.aws_profile || '';

        this.awsRegion = argvMap.aws_region || '';
        this.awsStackName = argvMap.aws_stackname || '';
        this.parallel = parseInt(argvMap.parallel || '', 10);
        this.outputDirPath = argvMap.output_dir_path || '';

        this.wrk2Thread = parseInt(argvMap.wrk2_thread || '', 10);
        this.wrk2Connection = parseInt(argvMap.wrk2_connection || '', 10);
        this.wrk2Duration = argvMap.wrk2_duration;
        this.wrk2ReqPerSec = parseInt(argvMap.wrk2_request_per_sec || '', 10);
        this.wrk2Timeout = parseInt(argvMap.wrk2_timeout || '', 10);
        this.wrk2Url = argvMap.wrk2_url || '';
        this.wrk2ScriptPath = argvMap.wrk2_script_path || '';
    }

    /**
     * Validate AWS Credentials options.
     * @returns {boolean}
     */
    validateAwsCredentials(): boolean {
        const hasCredentials = (this.awsAccessKey !== '' && this.awsSecret !== '') || this.awsProfile !== '';
        return hasCredentials && this.awsRegion !== '';
    }

    /**
     * Validate all values.
     */
    validate(): void {
        if (!this.validateAwsCredentials()) {
            throw new Error('error AWS credentials environment variables');
        }

        let msg = '';
        if (!this.awsStackName) {
            msg = 'aws_stackname';
        } else if (this.parallel <= 0) {
            msg = 'parallel';
        } else if (!this.outputDirPath) {
            msg = 'output_dir_path';
        } else if (this.wrk2Thread <= 0) {
            msg = 'wrk2_thread';
        } else if (this.wrk2Connection <= 0) {
            msg = 'wrk2_connection';
        } else if (this.getDurationInSec() <= 0) {
            msg = 'wrk2_duration';
        } else if (this.wrk2ReqPerSec <= 0) {
            msg = 'wrk2_request_per_sec';
        } else if (this.wrk2Timeout <= 0) {
            msg = 'wrk2_timeout';
        } else if (!this.wrk2Url) {
            msg = 'wrk2_url';
        } else if (!this.wrk2ScriptPath) {
            msg = 'wrk2_script_path';
        }

        if (msg !== '') {
            throw new Error(`error ${msg} is invalid`);
        }
    }

    /**
     * @returns {ConfigurationOptions}
     */
    awsCredentials(): AWS.ConfigurationOptions {
        if (!this.validateAwsCredentials()) {
            throw new Error('error AWS credentials environment variables');
        }

        const configOptions: AWS.ConfigurationOptions = {
            region: this.awsRegion,
        };
        if (!this.awsProfile) {
            configOptions.credentials = new AWS.SharedIniFileCredentials({ profile: this.awsProfile });
        }
        return configOptions;
    }

    /**
     * Returns duration as number from Wrk2 duration parameter.
     * @returns {number}
     */
    getDurationInSec(): number {
        const re = new RegExp('^(\\d+)([smh])$');
        const m = this.wrk2Duration.match(re);
        if (!m) {
            throw new Error(`invalid WRK_DURATION ${this.wrk2Duration}`);
        }

        let v = parseInt(m[1], 10);
        const unit = m[2];
        if (unit === 'm') {
            v += 60;
        } else if (unit === 'h') {
            v += 60 * 60;
        }
        return v;
    }
}

/**
 * Command
 */
export class Wrk2Cmd {
    private readonly s3: AWS.S3;
    private readonly lambda: AWS.Lambda;
    private readonly cloudformation: AWS.CloudFormation;

    /**
     * The CloudFormation stack name in AWS.
     */
    private readonly awsStackName: string;

    /**
     * Lambda Arn which has wrk2 docker image.
     */
    private awsLambdaArn: string;

    /**
     * Bucket to output results.
     */
    private bucketName: string;

    /**
     * Keys in Bucket for downloading to local.
     */
    private resultKeys: string[];

    /**
     * UniqueID to identify the execution.
     */
    private execId: string;

    /**
     * wrk2 script file name.
     */
    private readonly wrk2ScriptName: string;

    /**
     * Commandline options.
     */
    private readonly argv: Argv;

    /**
     * Error state.
     * Set error object, if an error happened in processing.
     */
    private err: Error;

    /**
     * Spinner.
     */
    private spinner: ora.Ora;

    /**
     * @param {Argv} argv pass commandline arguments.
     */
    constructor(argv: Argv) {
        this.setExecID();

        this.spinner = ora({
            text: '',
            spinner: 'dots',
        });
        this.spinner.color = 'cyan';

        argv.validate();

        this.argv = argv;

        // Update AWS config.
        AWS.config.update(argv.awsCredentials());

        // Initialize each resource.
        this.s3 = new AWS.S3({ apiVersion: '2006-03-01' });
        this.lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });
        this.cloudformation = new AWS.CloudFormation();

        this.awsStackName = argv.awsStackName;
        this.wrk2ScriptName = path.basename(this.argv.wrk2ScriptPath);

        if (this.awsStackName === '') {
            this.err = new Error(`error config:awsstack does not exist`);
        } else if (this.wrk2ScriptName === '') {
            this.err = new Error(`error wrk2 script name does not exist`);
        }
    }

    /**
     * Run command
     *
     * Call each process by this function.
     * Processing states are held in class properties.
     * @returns {string}
     * @returns {Promise<void>}
     */
    async run(): Promise<void> {
        await this.getStackProps();

        await this.updateLambdaEnv();

        await this.uploadWrk2Script();

        await this.invokeWrk2();

        await this.waitEnd();

        await this.downloadResults();

        if (this.isErr()) {
            this.spinner.fail(this.err.message);
            throw this.err;
        }

        const outputDir = path.join(this.argv.outputDirPath, this.s3ResultBaseKey());
        this.spinner.stopAndPersist({
            symbol: '🦄',
            text: `done. check results in ${outputDir}`,
        });
    }

    /**
     * Create UniqueID to identify the execution.
     */
    setExecID(): void {
        const d = new Date();
        // e.g. YYYYMMDDHHMMSS
        this.execId =
            d.getFullYear().toString() +
            ('0' + (d.getMonth() + 1).toString()).slice(-2) +
            ('0' + d.getDate().toString()).slice(-2) +
            ('0' + d.getHours().toString()).slice(-2) +
            ('0' + d.getMinutes().toString()).slice(-2) +
            ('0' + d.getSeconds().toString()).slice(-2);
    }

    /**
     * Returns error happened.
     * @returns {boolean}
     */
    isErr(): boolean {
        return typeof this.err !== 'undefined';
    }

    /**
     * Returns a prefix of result files.
     * @returns {string}
     */
    s3ResultBaseKey(): string {
        return this.execId + '/result';
    }

    /**
     * Get Resource props from CloudFormation Stack.
     * @returns {Promise<void>}
     */
    private async getStackProps() {
        if (this.isErr()) {
            return;
        }

        const consoleMsg = 'getting stack props';
        this.spinner.start(consoleMsg);

        const params: AWS.CloudFormation.Types.DescribeStacksInput = {
            StackName: this.awsStackName,
        };

        const res: AWS.CloudFormation.Types.DescribeStacksOutput = await this.cloudformation
            .describeStacks(params)
            .promise()
            .catch((error) => error);
        if (res instanceof Error) {
            this.err = res;
            return;
        }
        if (!res.Stacks || res.Stacks.length <= 0) {
            this.err = new Error('error no AWS stack');
            return;
        }

        // Get latest stack outputs.
        const stacks = res.Stacks.sort((l: AWS.CloudFormation.Types.Stack, r: AWS.CloudFormation.Types.Stack) => {
            const lt = l.LastUpdatedTime || '';
            const rt = r.LastUpdatedTime || '';
            if (lt > rt) {
                return -1;
            } else if (lt < rt) {
                return 1;
            }
            return 0;
        });
        stacks[0].Outputs?.forEach((output) => {
            if (output.OutputKey === AWSStackOutputKeyBucket) {
                this.bucketName = output.OutputValue || '';
            } else if (output.OutputKey === AWSStackOutputKeyLambda) {
                this.awsLambdaArn = output.OutputValue || '';
            }
        });

        if (this.bucketName === '' || this.awsLambdaArn === '') {
            this.err = new Error('error BucketName or LambdaArn does not exists in stack');
            return;
        }

        this.spinner.succeed(consoleMsg);
    }

    /**
     * Update Lambda environment variables.
     * @returns {Promise<void>}
     */
    async updateLambdaEnv(): Promise<void> {
        if (this.isErr()) {
            return;
        }

        const consoleMsg = 'update Lambda environment variables';
        this.spinner.start(consoleMsg);

        const params: AWS.Lambda.Types.UpdateFunctionConfigurationRequest = {
            FunctionName: this.awsLambdaArn,
            Environment: {
                Variables: {
                    PARALLEL_COUNT: `${this.argv.parallel}`,
                    S3_BUCKET: this.bucketName,
                    S3_RESULT_BASE_KEY: this.s3ResultBaseKey(),
                    WRK_THREAD: `${this.argv.wrk2Thread}`,
                    WRK_CONNECTION: `${this.argv.wrk2Connection}`,
                    WRK_DURATION: `${this.argv.wrk2Duration}`,
                    WRK_REQUEST_PER_SEC: `${this.argv.wrk2ReqPerSec}`,
                    WRK_SCRIPT_NAME: `${this.wrk2ScriptName}`,
                    WRK_TIMEOUT_SEC: `${this.argv.wrk2Timeout}`,
                    WRK_URL: `${this.argv.wrk2Url}`,
                    EXEC_ID: `${this.execId}`,
                },
            },
        };

        const res = await this.lambda
            .updateFunctionConfiguration(params)
            .promise()
            .catch((error) => error);
        if (res instanceof Error) {
            this.err = res;
            return;
        }

        this.spinner.succeed(consoleMsg);
    }

    /**
     * Upload a script wrk2 uses to S3.
     * @returns {Promise<void>}
     */
    private async uploadWrk2Script() {
        if (this.isErr()) {
            return;
        }

        const consoleMsg = `upload wrk2 script file`;
        this.spinner.start(consoleMsg);

        let body;
        try {
            body = readFileSync(this.argv.wrk2ScriptPath);
        } catch (err) {
            this.err = new Error(`'reading file error ${this.argv.wrk2ScriptPath} ` + util.inspect(err));
            return;
        }

        const params: AWS.S3.Types.PutObjectRequest = {
            Bucket: this.bucketName,
            Key: `${this.execId}/` + this.wrk2ScriptName,
            Body: body,
        };
        const res = await this.s3
            .putObject(params)
            .promise()
            .catch((error) => error);
        if (res instanceof Error) {
            this.err = res;
            return;
        }

        this.spinner.succeed(consoleMsg);
    }

    /**
     * Invoke Wrk2.
     * @returns {Promise<void>}
     */
    async invokeWrk2(): Promise<void> {
        if (this.isErr()) {
            return;
        }

        const consoleMsg = `invoked each Lambda`;
        this.spinner.start(consoleMsg);

        for (let i = 0; i < this.argv.parallel; i++) {
            const params: AWS.Lambda.Types.InvocationRequest = {
                FunctionName: this.awsLambdaArn,
                InvocationType: 'Event',
            };
            const res = await this.lambda
                .invoke(params)
                .promise()
                .catch((error) => error);
            if (res instanceof Error || res.StatusCode !== 202) {
                this.err = res;
                console.error(
                    `${i + 1}/${this.argv.parallel} invoked Lambda error code=` +
                        util.inspect(res, {
                            depth: null,
                            sorted: true,
                        }),
                );
                return;
            }

            this.spinner.text = `${i + 1}/${this.argv.parallel} invoked Lambda`;
        }

        this.spinner.succeed(`invoked each Lambda`);
    }

    /**
     * Wait for completion each Wrk2.
     * @returns {Promise<void>}
     */
    async waitEnd(): Promise<void> {
        if (this.isErr()) {
            return;
        }

        const consoleMsg = `waiting for each Lambda to end, they will output results in ${this.bucketName} bucket`;
        this.spinner.start(consoleMsg);

        // Ratio by experience.
        const ratio = 1.3;
        const firstWaitInterval = this.argv.getDurationInSec() * 1000 * ratio;
        const maxCount = 10;
        const waitInterval = 1500;

        // Start waiting.
        const waitFunc = new Promise((resolve, reject) => {
            let callCount = 0;

            const f = async () => {
                const params: AWS.S3.Types.ListObjectsV2Request = {
                    Bucket: this.bucketName,
                    Prefix: this.s3ResultBaseKey(),
                };

                let res: AWS.S3.Types.ListObjectsV2Output;
                this.resultKeys = [];
                do {
                    res = await this.s3
                        .listObjectsV2(params)
                        .promise()
                        .catch((error) => error);
                    if (res.KeyCount && res.KeyCount > 0 && res.Contents) {
                        res.Contents.forEach((obj) => {
                            if (obj.Key) {
                                this.resultKeys.push(obj.Key);
                            }
                        });
                    }
                    params.ContinuationToken = res.NextContinuationToken;
                } while (res.IsTruncated);

                if (this.resultKeys.length >= this.argv.parallel) {
                    // Done
                    resolve(true);
                    return;
                }

                callCount++;
                if (maxCount < callCount) {
                    reject(new Error('error could not get Lambda state'));
                    return;
                }

                // Retry
                setTimeout(f, waitInterval);
            };
            setTimeout(f, firstWaitInterval);
        });

        const res = await waitFunc.catch((error) => error);
        if (res instanceof Error) {
            this.err = res;
            return;
        }

        this.spinner.succeed(consoleMsg);
    }

    /**
     * Download Wrk2 results.
     * @returns {Promise<void>}
     */
    async downloadResults(): Promise<void> {
        if (this.isErr()) {
            return;
        }

        const consoleMsg = `download results`;
        this.spinner.start(consoleMsg);

        // Create output dir
        const outputDir = path.join(this.argv.outputDirPath, this.s3ResultBaseKey());
        try {
            fs.mkdirSync(outputDir, {
                recursive: true,
            });
        } catch (err) {
            this.err = new Error(`error create output directory ${outputDir} ${err}`);
            return;
        }

        for (let i = 0, len = this.resultKeys.length; i < len; i++) {
            const key = this.resultKeys[i];
            const msgPrefix = `${i + 1}/${this.resultKeys.length}: `;
            const errMsg = `${msgPrefix}download error key=${key}, download from ${this.bucketName} manually, or retry`;

            const params = {
                Bucket: this.bucketName,
                Key: key,
            };
            const res = await this.s3
                .getObject(params)
                .promise()
                .catch((error) => error);
            if (res instanceof Error) {
                this.err = new Error(`${errMsg} ${util.inspect(res)}`);
                return;
            }

            try {
                fs.writeFileSync(path.join(this.argv.outputDirPath, key), res.Body.toString());
                this.spinner.text = `${msgPrefix}download key=${key}`;
            } catch (err) {
                this.err = new Error(`${errMsg} ${util.inspect(err)}`);
                return;
            }
        }

        this.spinner.succeed(consoleMsg);
    }
}
