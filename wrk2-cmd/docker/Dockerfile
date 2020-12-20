FROM amazon/aws-cli

# Setup wrk2
COPY wrk2 /src/wrk2
RUN yum install make gcc openssl-devel -y \
    && cd /src/wrk2 \
    && make \
    && ls -la \
    && rm -rf /var/cache/yum/* \
    && yum clean all

# Copy scripts
COPY function.sh /function.sh

ENTRYPOINT [ "/bin/bash" ]
CMD ["/function.sh"]