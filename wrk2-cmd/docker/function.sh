#!/bin/bash

# Include wrk2 binary
WRK2DIR=/src/wrk2

# Lambda only allow to write file in /tmp.
TMP_DIR=/tmp

# Temporary result file
TMP_RESULT_FILE=${TMP_DIR}/wrk_result

# Validate environtment variables
function validate_variable() {
    NAMES=("PARALLEL_COUNT" "WRK_THREAD" "WRK_CONNECTION" "WRK_DURATION" \
        "WRK_REQUEST_PER_SEC" "WRK_SCRIPT_NAME" "WRK_TIMEOUT_SEC" "WRK_URL" \
        "S3_BUCKET" "S3_RESULT_BASE_KEY" "EXEC_ID" \
        )
    for n in ${NAMES[@]}; do
        if [[ "${!n}" == "" ]]; then
            RESPONSE="error set ${n}"
            return
        fi
    done
}

# Run wrk2 and output logs to S3.
# Pass Lambda request id as argument.
# Write a result to RESPONSE.
function run_wrk() {
    LAMBDA_REQ_ID="$1"

    # Check env variables
    validate_variable
    if [[ "$RESPONSE" != "" ]]; then
        return
    fi

    cd $WRK2DIR

    # Output logs related wrk2 command.
    LOG_CMD_LINE="run ./wrk -t${WRK_THREAD} -c${WRK_CONNECTION} -d${WRK_DURATION} -R${WRK_REQUEST_PER_SEC} -s ${TMP_DIR}/${WRK_SCRIPT_NAME} -T ${WRK_TIMEOUT_SEC} --latency ${WRK_URL}"

    echo "$EXEC_ID" > $TMP_RESULT_FILE
    echo "$LAMBDA_REQ_ID" >> $TMP_RESULT_FILE
    echo "$LOG_CMD_LINE" >> $TMP_RESULT_FILE
    echo "$EXEC_ID" "$LAMBDA_REQ_ID" "$LOG_CMD_LINE"

    # Run wrk2
    ./wrk -t${WRK_THREAD} -c${WRK_CONNECTION} -d${WRK_DURATION} -R${WRK_REQUEST_PER_SEC} -s${TMP_DIR}/${WRK_SCRIPT_NAME} -T ${WRK_TIMEOUT_SEC} --latency ${WRK_URL} 2>&1 >> $TMP_RESULT_FILE

    # Upload result file to S3
    S3_KEY=${S3_RESULT_BASE_KEY}/${LAMBDA_REQ_ID}.txt
    aws s3api put-object --bucket ${S3_BUCKET} --key ${S3_KEY} --body $TMP_RESULT_FILE --output text 2>&1
    echo "$EXEC_ID" "$LAMBDA_REQ_ID" "uploaded ${S3_KEY}"

    RESPONSE="done"
}

# Get post.lua from S3
aws s3api get-object --output text --bucket ${S3_BUCKET} --key ${EXEC_ID}/${WRK_SCRIPT_NAME} $TMP_DIR/$WRK_SCRIPT_NAME 2>&1
echo "$EXEC_ID" "$LAMBDA_REQ_ID" "downloaded ${EXEC_ID}/${WRK_SCRIPT_NAME}"

# Processing Lambda handler
while true
do
  HEADERS="$(mktemp)"
  # Get an event. The HTTP request will block until one is received
  EVENT_DATA=$(curl -sS -LD "$HEADERS" -X GET "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next")

  # Extract request ID by scraping response headers received above
  REQUEST_ID=$(grep -Fi Lambda-Runtime-Aws-Request-Id "$HEADERS" | tr -d '[:space:]' | cut -d: -f2)

  # Run the main process
  RESPONSE=""
  run_wrk "${REQUEST_ID}"
  echo "$EXEC_ID" "$REQUEST_ID" "$RESPONSE"

  curl -sS -X POST "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/$REQUEST_ID/response" -d "$RESPONSE"
done