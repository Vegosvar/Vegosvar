#!/bin/bash
set -ev

ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no vegosvar@dev.vegosvar.se -i deploy_key 'cd /opt/vegosvar && git pull && npm install && gulp prod && sudo service vegosvar restart'