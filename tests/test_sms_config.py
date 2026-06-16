from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

import server


class SmsConfigTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_sms_config_path = server.SMS_CONFIG_PATH
        self.original_urlopen = server.urllib.request.urlopen
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
        server.urllib.request.urlopen = self.original_urlopen
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
            os.environ["SMS_BASE_URL"] = "https://push.spug.cc/sms"
            os.environ["SMS_TTL_MINUTES"] = "6"
            os.environ["SMS_TIMEOUT_SECONDS"] = "12"

            config = server.load_sms_config()

        self.assertTrue(config["enabled"])
        self.assertEqual(config["provider"], "spug")
        self.assertEqual(config["template_id"], "template-from-env")
        self.assertEqual(config["base_url"], "https://push.spug.cc/sms")
        self.assertEqual(config["ttl_minutes"], 6)
        self.assertEqual(config["timeout_seconds"], 12)

    def test_spug_sms_request_uses_sms_area_to_parameter(self) -> None:
        captured = {}

        class FakeResponse:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return None

            def read(self):
                return b'{"code":0,"msg":"ok"}'

        def fake_urlopen(request, timeout=0):
            captured["url"] = request.full_url
            captured["timeout"] = timeout
            captured["body"] = json.loads(request.data.decode("utf-8"))
            return FakeResponse()

        with tempfile.TemporaryDirectory() as tmpdir:
            server.SMS_CONFIG_PATH = Path(tmpdir) / "sms_config.json"
            os.environ["SMS_ENABLED"] = "true"
            os.environ["SMS_PROVIDER"] = "spug"
            os.environ["SMS_TEMPLATE_ID"] = "template-from-env"
            os.environ["SMS_BASE_URL"] = "https://push.spug.cc/sms"
            os.environ["SMS_TIMEOUT_SECONDS"] = "9"
            server.urllib.request.urlopen = fake_urlopen

            ok, message = server.send_sms_code("18685442407", "123456")

        self.assertTrue(ok)
        self.assertEqual(message, "验证码已发送，请查收短信")
        self.assertEqual(captured["url"], "https://push.spug.cc/sms/template-from-env")
        self.assertEqual(captured["timeout"], 9)
        self.assertEqual(captured["body"], {"code": "123456", "to": "18685442407"})


if __name__ == "__main__":
    unittest.main()
