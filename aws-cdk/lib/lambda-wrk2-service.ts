import * as cdk from "@aws-cdk/core";
import s3 = require("@aws-cdk/aws-s3");
import lambda = require("@aws-cdk/aws-lambda");

export interface LambdaWrk2ServiceProps extends cdk.StackProps {
    // A directory path included Dockerfile of container to deploy.
    dockerfilePath: string;
}

// Ref. https://docs.aws.amazon.com/cdk/latest/guide/stacks.html
export class LambdaWrk2Service extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: LambdaWrk2ServiceProps) {
        super(scope, id);

        // Lambda
        const timeoutMax: cdk.Duration = cdk.Duration.minutes(15);
        const fn = new lambda.DockerImageFunction(this, `${id}-DockerFunction`, {
            code: lambda.DockerImageCode.fromImageAsset(props.dockerfilePath),
            timeout: timeoutMax,
        });

        // S3
        const bucket = new s3.Bucket(this, `${id}-WorkBucket`, {
            encryption: s3.BucketEncryption.S3_MANAGED,
        });
        bucket.grantReadWrite(fn);

        // Outputs
        new cdk.CfnOutput(this, "BucketName", {value: bucket.bucketName});
        new cdk.CfnOutput(this, "LambdaArn", {value: fn.functionArn});
    }
}
