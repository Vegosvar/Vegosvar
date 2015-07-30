#!/bin/bash
set -ev

ssh vegosvar@dev.vegosvar.se -i deploy_key 'cd /opt/vegosvar && git pull && npm install && gulp prod && sudo service vegosvar restart'