import 'package:flutter/material.dart';

class ReelActions extends StatelessWidget {
  final VoidCallback? onPrimary;

  const ReelActions({Key? key, this.onPrimary = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      children: <Widget>[
        ElevatedButton(
          onPressed: onPrimary,
          style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF2563EB), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
          child: Text('Open profile'),
        ),
        TextButton(
          onPressed: null,
          style: TextButton.styleFrom(foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
          child: Text('Like'),
        ),
      ],
    );
  }
}
