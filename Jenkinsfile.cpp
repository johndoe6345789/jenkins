pipeline {
    agent any

    options {
        ansiColor('xterm')
        timestamps()
    }

    parameters {
        choice(name: 'BUILD_TYPE', choices: ['Release', 'Debug', 'RelWithDebInfo'], description: 'CMake build type')
    }

    stages {
        stage('Configure') {
            steps {
                sh '''
                    cmake -B build -G Ninja \
                        -DCMAKE_BUILD_TYPE=${BUILD_TYPE} \
                        -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
                '''
            }
        }

        stage('Build') {
            steps {
                sh 'cmake --build build --parallel $(nproc)'
            }
        }

        stage('Test') {
            steps {
                sh 'ctest --test-dir build --output-on-failure --parallel $(nproc)'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'build/**/*.xml'
                }
            }
        }

        stage('Lint') {
            steps {
                sh '''
                    find src -name "*.cpp" -o -name "*.h" | \
                        xargs clang-format --dry-run --Werror
                '''
            }
        }
    }

    post {
        always {
            recordIssues tools: [clangTidy(pattern: 'build/clang-tidy.log')]
        }
        cleanup {
            cleanWs()
        }
    }
}
