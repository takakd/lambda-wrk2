import {expect as expectCDK, haveOutput, haveResource} from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as App from '../lib/lambda-wrk2-service';
import path = require("path");

test('Empty Stack', () => {
    // WHEN
    const app = new cdk.App();
    const props: App.LambdaWrk2ServiceProps = {
        dockerfilePath: path.resolve(__dirname, 'testdocker')
    };
    const stack = new App.LambdaWrk2Service(app, 'TestStack', props);

    // THEN
    expectCDK(stack).to(haveResource("AWS::Lambda::Function"))
    expectCDK(stack).to(haveResource("AWS::S3::Bucket", {
        BucketEncryption: {
            ServerSideEncryptionConfiguration: [
                {
                    ServerSideEncryptionByDefault: {
                        SSEAlgorithm: 'AES256'
                    }
                }
            ]
        }
    }));
    expectCDK(stack).to(haveOutput({
        outputName: 'BucketName',
    }))
    expectCDK(stack).to(haveOutput({
        outputName: 'LambdaArn',
    }))
});
