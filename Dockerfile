#Download base image ubuntu 22.04
FROM ubuntu:22.04

# Disable Prompt During Packages Installation
ARG DEBIAN_FRONTEND=noninteractive

# Update Ubuntu Software repository
RUN apt update -y
RUN apt upgrade -y

# Create a working directory
RUN mkdir /dockapp
WORKDIR /dockapp

# Copy all files to the new directory
COPY . /dockapp
COPY ../[service-key].json /dockapp
COPY ../[gcp-creds].txt /dockapp

# Install GCLoud CLI
RUN apt-get install apt-transport-https ca-certificates gnupg curl wget apt-utils git nano -y
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" |  tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg |  apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
RUN apt-get update  &&  apt-get install google-cloud-cli -y

# Updating node and nodejs
RUN curl -fsSL https://deb.nodesource.com/setup_19.x | bash - && apt-get install -y nodejs

#installing pulumi
RUN curl -fsSL https://get.pulumi.com | sh
ENV PATH="/root/.pulumi/bin:${PATH}"
RUN mkdir /usr/bin/.pulumi && mv /root/.pulumi/* /usr/bin/.pulumi/ 
ENV PATH "$PATH:/usr/bin/.pulumi/bin/"

# Expose Port for the Application 
EXPOSE 80 443