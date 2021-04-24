# 0mq-nodejs
An IPC exercise of zeroMQ using nodejs 


## Important
To build zeromq on CentOS 7 successfully, run the following commands to install the gcc-g++ 7 toolkit, which is required to build zeromq source code.
prebuilt binary is only available on CentOS 8

```
yum install centos-release-scl
yum install install devtoolset-7-gcc-c++
scl enable devtoolset-7 bash
which g++
g++ --version

```

### Install Cmake on CentOS

```shell
$ yum -y install gcc gcc-c++ openssl openssl-devel tar
$ cd /opt/
$ wget https://github.com/Kitware/CMake/releases/download/v3.16.2/cmake-3.16.2.tar.gz
$ tar -zxf cmake-3.16.2.tar.gz
$ cd cmake-3.16.2
$ ./bootstrap --prefix=/usr --datadir=share/cmake --docdir=doc/cmake && make
$ sudo make install
```
