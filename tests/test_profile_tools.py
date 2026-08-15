import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "skill" / "resume-application-copilot" / "scripts"

def load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

profile_cli = load("profile_cli")
questionnaire = load("questionnaire")

class ProfileToolsTest(unittest.TestCase):
    def test_blank_profile_validates(self):
        self.assertEqual(profile_cli.validate(profile_cli.blank_profile()), [])

    def test_deep_merge_preserves_other_fields(self):
        merged = profile_cli.deep_merge(profile_cli.blank_profile(), {"personal": {"full_name": "林晓舟"}})
        self.assertEqual(merged["personal"]["full_name"], "林晓舟")
        self.assertIn("email", merged["personal"])

    def test_restricted_export_is_redacted(self):
        profile = profile_cli.blank_profile()
        profile["sensitive"]["national_id"] = "secret"
        exported = profile_cli.redact_restricted(profile)
        self.assertNotIn("sensitive", exported)

    def test_questionnaire_starts_with_name(self):
        result = questionnaire.next_question(profile_cli.blank_profile())
        self.assertEqual(result["path"], "personal.full_name")

    def test_sensitive_questions_are_optional(self):
        profile = profile_cli.blank_profile()
        profile["personal"].update({"full_name": "A", "phone": "1", "email": "a@example.com", "current_city": "广州"})
        profile["intent"].update({"target_roles": ["AI"], "preferred_cities": ["广州"], "employment_type": "实习", "availability": "随时"})
        profile["education"] = [{"school": "示例大学"}]
        profile["experience"] = [{"company": "示例公司"}]
        profile["answers"]["self_introduction"] = "介绍"
        self.assertIsNone(questionnaire.next_question(profile, include_sensitive=False))
        self.assertEqual(questionnaire.next_question(profile, include_sensitive=True)["path"], "personal.birth_date")

if __name__ == "__main__":
    unittest.main()
