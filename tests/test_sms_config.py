from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

import server


class SmsConfigTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_sms_config_path = server.SMS_CONFIG_PATH
        self.original_env = {
            key: os.environ.get(key)
            for key in (
                "SMS_ENABLED",
                "SMS_PROVIDER",
                "SMS_TEMPLATE_ID",
                "SMS_BASE_URL",
                "SMS_TTL_MINUTES",
                "SMS_TIMEOUT_SECONDS",
            )
        }

    def tearDown(self) -> None:
        server.SMS_CONFIG_PATH = self.original_sms_config_path
        for key, value in self.original_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def test_env_sms_config_works_without_local_config_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            server.SMS_CONFIG_PATH = Path(tmpdir) / "sms_config.json"
            os.environ["SMS_ENABLED"] = "true"
            os.environ["SMS_PROVIDER"] = "spug"
            os.environ["SMS_TEMPLATE_ID"] = "template-from-env"
            os.environ["SMS_BASE_URL"] = "https://push.spug.cc/send"
            os.environ["SMS_TTL_MINUTES"] = "6"
            os.environ["SMS_TIMEOUT_SECONDS"] = "12"

            config = server.load_sms_config()

        self.assertTrue(config["enabled"])
        self.assertEqual(config["provider"], "spug")
        self.assertEqual(config["template_id"], "template-from-env")
        self.assertEqual(config["base_url"], "https://push.spug.cc/send")
        self.assertEqual(config["ttl_minutes"], 6)
        self.assertEqual(config["timeout_seconds"], 12)


if __name__ == "__main__":
    unittest.main()
