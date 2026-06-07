# SAM custom build target — runs inside the Lambda build container (Amazon Linux).
# Installs dependencies, then copies only the runtime source files.
# .env, run_local.py, and other local-only files are intentionally excluded.

.PHONY: build-NotohubFunction

build-NotohubFunction:
	pip install -r requirements.txt -t $(ARTIFACTS_DIR)
	cp handler.py $(ARTIFACTS_DIR)/
	cp -r lib/ $(ARTIFACTS_DIR)/lib/
	cp -r handlers/ $(ARTIFACTS_DIR)/handlers/
