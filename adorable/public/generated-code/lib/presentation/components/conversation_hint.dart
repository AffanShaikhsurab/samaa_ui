import 'package:flutter/material.dart';

class ConversationHint extends StatelessWidget {
  final String label;

  const ConversationHint({Key? key, required this.label})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toString(),
      style: const TextStyle(fontSize: 12, color: Color(0xFF8E8E8E)),
    );
  }
}
